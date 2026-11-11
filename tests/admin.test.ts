import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../db/client";
import { getDraft, publishGame, saveDraft, type DraftInput } from "../modules/games/admin";
import { listGames } from "../modules/games/queries";
import { actor, dbNow } from "./helpers";
after(closeDb);
export async function draftFixture(count=2,capacity=count) {
 const admin=await actor("ADMIN");const students=await Promise.all(Array.from({length:count},()=>actor()));const now=await dbNow();
 const input:DraftInput={title:"Simulasi Fiksi",termsText:"Ketentuan fiksi",startsAt:new Date(now.getTime()+60000).toISOString(),endsAt:new Date(now.getTime()+3600000).toISOString(),packages:[{name:"Paket A",capacity}],userIds:students.map(s=>s.id)};
 return {admin,students,input};
}
test("draft validation and admin authorization",async()=>{
 const {admin,students,input}=await draftFixture();
 await assert.rejects(saveDraft(students[0],input),{code:"FORBIDDEN"});
 await assert.rejects(saveDraft(admin,{...input,endsAt:input.startsAt}),{code:"INVALID_DATES"});
 await assert.rejects(saveDraft(admin,{...input,packages:[{name:"A",capacity:1},{name:"a",capacity:1}]}),{code:"DUPLICATE_PACKAGE"});
 const game=await saveDraft(admin,input); assert.equal((await getDraft(admin,game.id)).whitelist.length,2);
 await assert.rejects(publishGame(students[0],game.id),{code:"FORBIDDEN"});
});
test("capacity uses whole whitelist; publication freezes direct and API updates",async()=>{
 const {admin,students,input}=await draftFixture(2,1);const game=await saveDraft(admin,input);
 await assert.rejects(publishGame(admin,game.id),{code:"INSUFFICIENT_CAPACITY"});
 await saveDraft(admin,{...input,packages:[{name:"A",capacity:2}]},game.id);await publishGame(admin,game.id);
 await assert.rejects(saveDraft(admin,input,game.id),{code:"CONFIGURATION_FROZEN"});
 await assert.rejects(getDb().execute(sql`UPDATE games SET title='Changed' WHERE id=${game.id}`));
 await assert.rejects(getDb().execute(sql`UPDATE game_packages SET capacity=10 WHERE game_id=${game.id}`));
 await assert.rejects(getDb().execute(sql`DELETE FROM game_participants WHERE game_id=${game.id}`));
 assert.ok((await listGames(students[0])).some(g=>g.id===game.id));
 assert.ok(!(await listGames(await actor())).some(g=>g.id===game.id));
});
test("missing packages, whitelist or terms cannot publish; audit append-only",async()=>{
 const {admin,input}=await draftFixture();
 for(const change of [{packages:[]},{userIds:[]},{termsText:""}]){const game=await saveDraft(admin,{...input,...change});await assert.rejects(publishGame(admin,game.id));}
 await assert.rejects(getDb().execute(sql`UPDATE admin_audit_logs SET action='CHANGED' WHERE admin_user_id=${admin.id}`));
});
