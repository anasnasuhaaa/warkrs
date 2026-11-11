import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { allocations, events, games, packages, preferences, submissions } from "@/db/schema";
import { Actor } from "@/lib/authorization";
import { invariant } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { activeMember, lockGame, type Transaction } from "@/modules/games/lifecycle";
import { effectiveStatus } from "@/modules/games/status";
export type Result={submissionId:string;sequence:number;acceptedAt:Date;allocation:{packageId:string;packageName:string;awardedRank:number}};
async function recorded(tx:Transaction,id:string,userId:string):Promise<Result|null> {
 const [row]=await tx.select({submissionId:submissions.id,sequence:submissions.sequence,acceptedAt:submissions.acceptedAt,packageId:allocations.packageId,awardedRank:allocations.awardedRank,packageName:packages.name}).from(submissions).innerJoin(allocations,eq(allocations.submissionId,submissions.id)).innerJoin(packages,eq(packages.id,allocations.packageId)).where(and(eq(submissions.gameId,id),eq(submissions.userId,userId)));
 return row?{submissionId:row.submissionId,sequence:row.sequence,acceptedAt:row.acceptedAt,allocation:{packageId:row.packageId,packageName:row.packageName,awardedRank:row.awardedRank}}:null;
}
export async function ownSubmission(actor:Actor,id:string) {
 return getDb().transaction(async tx=>{await activeMember(tx,actor,id);return recorded(tx,id,actor.id);});
}
export async function submitRanking(actor:Actor,id:string,packageIds:unknown):Promise<Result> {
 const parsed=z.array(z.uuid()).min(1).max(50).safeParse(packageIds);
 invariant(parsed.success,"INVALID_RANKING","Urutkan seluruh paket tepat satu kali.");
 await limit(`submission:${id}:${actor.id}`,30);
 return getDb().transaction(async tx=>{
  const {game,now}=await lockGame(tx,id);const member=await activeMember(tx,actor,id);
  invariant(member.joinedAt&&member.consentedAt&&member.consentedTermsVersion===game.termsVersion,"FORBIDDEN","Bergabung dan setujui ketentuan terlebih dahulu.",403);
  const previous=await recorded(tx,id,actor.id);if(previous)return previous;
  const status=effectiveStatus(game,now);
  invariant(status==='Live',status==='Closing'||status==='Completed'?"GAME_CLOSED":"GAME_NOT_LIVE",status==='Upcoming'?"War belum dimulai.":"Pengiriman baru telah ditutup.",status==='Closing'||status==='Completed'?410:409);
  const all=await tx.select({id:packages.id,name:packages.name}).from(packages).where(eq(packages.gameId,id));const ids=parsed.data;
  invariant(ids.length===all.length&&new Set(ids).size===all.length&&ids.every(id=>all.some(p=>p.id===id)),"INVALID_RANKING","Urutkan seluruh paket game ini tepat satu kali.");
  const [counter]=await tx.update(games).set({nextSequence:sql`${games.nextSequence}+1`}).where(eq(games.id,id)).returning({sequence:games.nextSequence});
  const submissionId=randomUUID();
  await tx.insert(submissions).values({id:submissionId,gameId:id,userId:actor.id,sequence:counter.sequence,acceptedAt:now});
  await tx.insert(preferences).values(ids.map((packageId,index)=>({submissionId,gameId:id,rank:index+1,packageId})));
  await tx.insert(events).values({gameId:id,submissionId,actorId:actor.id,type:"SUBMISSION_ACCEPTED",sequence:counter.sequence,createdAt:now});
  for(let i=0;i<ids.length;i++) {
   const [reserved]=await tx.update(packages).set({allocatedCount:sql`${packages.allocatedCount}+1`}).where(and(eq(packages.id,ids[i]),eq(packages.gameId,id),sql`${packages.allocatedCount}<${packages.capacity}`)).returning({id:packages.id,name:packages.name});
   if(!reserved){await tx.insert(events).values({gameId:id,submissionId,actorId:actor.id,type:"PREFERENCE_SKIPPED_FULL",packageId:ids[i],rank:i+1,sequence:counter.sequence,createdAt:now});continue;}
   await tx.insert(allocations).values({id:randomUUID(),submissionId,gameId:id,userId:actor.id,packageId:reserved.id,awardedRank:i+1,allocatedAt:now});
   await tx.insert(events).values({gameId:id,submissionId,actorId:actor.id,type:"PACKAGE_ALLOCATED",packageId:reserved.id,rank:i+1,sequence:counter.sequence,createdAt:now});
   return {submissionId,sequence:counter.sequence,acceptedAt:now,allocation:{packageId:reserved.id,packageName:reserved.name,awardedRank:i+1}};
  }
  // Throwing rolls back counter, ranking, occupancy and all unpublished events.
  invariant(false,"ALLOCATION_INVARIANT","Alokasi tidak dapat diselesaikan. Hubungi admin.",503);
 });
}
