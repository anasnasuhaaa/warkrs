import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../db/client";
import { submitRanking, ownSubmission } from "../modules/allocation/service";
import { endGame, joinGame } from "../modules/games/lifecycle";
import { gameDetail } from "../modules/games/detail";
import { gameFixture } from "./fixtures";
import { actor } from "./helpers";
after(closeDb);
async function integrity(id:string,expected:number) {
 const r=await getDb().execute(sql`SELECT
 (SELECT count(*)::int FROM war_submissions WHERE game_id=${id}) s,
 (SELECT count(*)::int FROM war_allocations WHERE game_id=${id}) a,
 (SELECT coalesce(sum(allocated_count),0)::int FROM game_packages WHERE game_id=${id}) used,
 (SELECT count(*)::int FROM game_packages p WHERE p.game_id=${id} AND (p.allocated_count>p.capacity OR p.allocated_count<>(SELECT count(*) FROM war_allocations a WHERE a.package_id=p.id))) bad`);
 assert.deepEqual(r.rows[0],{s:expected,a:expected,used:expected,bad:0});
}
for(const count of [200,500])test(`${count} simultaneous submissions: zero oversell, complete rankings, authoritative FCFS`,async()=>{
 const capacities=[Math.floor(count/4),Math.floor(count/4),count-2*Math.floor(count/4)];const f=await gameFixture({count,capacities});const started=performance.now();const durations:number[]=[];
 const results=await Promise.all(f.students.map(async s=>{const start=performance.now();const result=await submitRanking(s,f.id,f.packageIds);durations.push(performance.now()-start);return result;}));
 const elapsed=performance.now()-started;await integrity(f.id,count);
 const sorted=results.toSorted((a,b)=>a.sequence-b.sequence);assert.deepEqual(sorted.map(r=>r.sequence),Array.from({length:count},(_,i)=>i+1));
 for(let i=0;i<count;i++){const orderedCapacities=f.game.packages.map(p=>p.capacity);const expected=i<orderedCapacities[0]?0:i<orderedCapacities[0]+orderedCapacities[1]?1:2;assert.equal(sorted[i].allocation.packageId,f.packageIds[expected]);assert.equal(sorted[i].allocation.awardedRank,expected+1);if(i)assert.ok(sorted[i].acceptedAt>=sorted[i-1].acceptedAt);}
 const prefs=await getDb().execute(sql`SELECT count(*)::int AS n FROM war_preferences WHERE game_id=${f.id}`);assert.equal(prefs.rows[0].n,count*3);
 assert.equal((await gameDetail(f.admin,f.id)).status,"Live");
 durations.sort((a,b)=>a-b);console.log(JSON.stringify({scenario:"transaction-burst",clients:count,totalMs:Math.round(elapsed),p95Ms:Math.round(durations[Math.ceil(count*.95)-1]),p99Ms:Math.round(durations[Math.ceil(count*.99)-1]),poolMax:5}));
});
test("two racers for one seat fall back; concurrent duplicate and lost-response lookup remain stable",async()=>{
 const f=await gameFixture({capacities:[1,1]});const results=await Promise.all(f.students.map(s=>submitRanking(s,f.id,f.packageIds)));
 assert.deepEqual(results.map(r=>r.allocation.awardedRank).sort(),[1,2]);await integrity(f.id,2);
 const duplicates=await Promise.all(Array.from({length:10},()=>submitRanking(f.students[0],f.id,[...f.packageIds].reverse())));duplicates.forEach(r=>assert.deepEqual(r,results[0]));
 await endGame(f.admin,f.id,"Fiksi pengujian hasil tetap");assert.deepEqual(await ownSubmission(f.students[0],f.id),results[0]);assert.deepEqual(await submitRanking(f.students[0],f.id,f.packageIds),results[0]);await integrity(f.id,2);
 await assert.rejects(getDb().execute(sql`UPDATE war_allocations SET awarded_rank=2 WHERE game_id=${f.id}`));
});
test("invalid, duplicate, missing, foreign, early, unjoined and inactive requests denied; late join can submit",async()=>{
 const f=await gameFixture({capacities:[1,1],join:false});await assert.rejects(submitRanking(f.students[0],f.id,f.packageIds),{code:"FORBIDDEN"});await assert.rejects(submitRanking(await actor(),f.id,f.packageIds),{code:"FORBIDDEN"});
 await joinGame(f.students[0],f.id,{accepted:true,acceptedTermsVersion:f.game.termsVersion});
 for(const ids of [[],[f.packageIds[0]],[f.packageIds[0],f.packageIds[0]],[f.packageIds[0],crypto.randomUUID()]])await assert.rejects(submitRanking(f.students[0],f.id,ids),{code:"INVALID_RANKING"});
 const early=await gameFixture({startOffset:60000});await assert.rejects(submitRanking(early.students[0],early.id,early.packageIds),{code:"GAME_NOT_LIVE"});
 await submitRanking(f.students[0],f.id,f.packageIds);await integrity(f.id,1);
 const inactive=await gameFixture();await getDb().execute(sql`UPDATE users SET email_verified=false WHERE id=${inactive.students[0].id}`);await assert.rejects(submitRanking(inactive.students[0],inactive.id,inactive.packageIds),{code:"FORBIDDEN"});
});
test("manual close racing with admission preserves committed results and rejects all later admissions",async()=>{
 const f=await gameFixture({count:20});const first=await submitRanking(f.students[0],f.id,f.packageIds);
 const jobs=[submitRanking(f.students[1],f.id,f.packageIds),endGame(f.admin,f.id,"Pengujian kontensi penutupan"),...f.students.slice(2).map(s=>submitRanking(s,f.id,f.packageIds))];
 await Promise.allSettled(jobs);const rows=await getDb().execute(sql`SELECT count(*)::int AS n FROM war_allocations WHERE game_id=${f.id}`);const accepted=Number(rows.rows[0].n);assert.ok(accepted>=1&&accepted<=20);await integrity(f.id,accepted);assert.deepEqual(await ownSubmission(f.students[0],f.id),first);
 const noResult=await Promise.all(f.students.map(async s=>({s,result:await ownSubmission(s,f.id)})));for(const {s} of noResult.filter(r=>!r.result))await assert.rejects(submitRanking(s,f.id,f.packageIds),{code:"GAME_CLOSED"});
});
test("deadline is rechecked after waiting for shared game lock",async()=>{
 const f=await gameFixture({endOffset:500});let ready!:()=>void;const locked=new Promise<void>(r=>ready=r);
 const holder=getDb().transaction(async tx=>{await tx.execute(sql`SELECT id FROM games WHERE id=${f.id} FOR UPDATE`);ready();await tx.execute(sql`SELECT pg_sleep(0.65)`);});await locked;
 const request=submitRanking(f.students[0],f.id,f.packageIds);await holder;await assert.rejects(request,{code:"GAME_CLOSED"});await integrity(f.id,0);
});
test("real database error rolls back sequence, quota, preferences, allocations and unpublished events",async()=>{
 const f=await gameFixture();assert.match(f.id,/^[a-f0-9-]+$/);
 await getDb().execute(sql.raw("CREATE FUNCTION test_reject_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected database failure'; END $$"));
 await getDb().execute(sql.raw(`CREATE TRIGGER test_reject_allocation BEFORE INSERT ON war_allocations FOR EACH ROW WHEN (NEW.game_id='${f.id}') EXECUTE FUNCTION test_reject_allocation()`));
 try{await assert.rejects(submitRanking(f.students[0],f.id,f.packageIds));await integrity(f.id,0);assert.equal(await ownSubmission(f.students[0],f.id),null);const r=await getDb().execute(sql`SELECT next_submission_sequence AS sequence,(SELECT count(*)::int FROM war_events WHERE game_id=${f.id}) AS events FROM games WHERE id=${f.id}`);assert.deepEqual(r.rows[0],{sequence:0,events:0});}
 finally{await getDb().execute(sql`DROP TRIGGER test_reject_allocation ON war_allocations`);await getDb().execute(sql`DROP FUNCTION test_reject_allocation()`);}
 const recovered=await submitRanking(f.students[0],f.id,f.packageIds);assert.equal(recovered.sequence,1);await integrity(f.id,1);
});
test("deferred database invariant rejects partial commits",async()=>{
 const f=await gameFixture();await assert.rejects(getDb().execute(sql`INSERT INTO war_submissions(id,game_id,user_id,sequence) VALUES(${crypto.randomUUID()},${f.id},${f.students[0].id},1)`));await integrity(f.id,0);
});
