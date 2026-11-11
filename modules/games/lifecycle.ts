import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { auditLogs, events, games, participants, user } from "@/db/schema";
import { Actor, adminOnly } from "@/lib/authorization";
import { invariant } from "@/lib/errors";
import { effectiveStatus } from "./status";
export type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function lockGame(tx:Transaction,id:string) {
 await tx.execute(sql`SELECT id FROM games WHERE id=${id} FOR UPDATE`);
 const [game]=await tx.select().from(games).where(eq(games.id,id));invariant(game,"NOT_FOUND","Game tidak ditemukan.",404);
 const result=await tx.execute(sql`SELECT clock_timestamp() AS now`);
 return {game,now:new Date(result.rows[0].now as string)};
}
export async function activeMember(tx:Transaction,actor:Actor,id:string) {
 const [member]=await tx.select().from(participants).innerJoin(user,eq(user.id,participants.userId)).where(and(eq(participants.gameId,id),eq(participants.userId,actor.id)));
 invariant(member?.users.emailVerified,"FORBIDDEN","Akun aktif dalam daftar peserta diperlukan.",403);
 return member.game_participants;
}

export const joinInput=z.object({accepted:z.literal(true),acceptedTermsVersion:z.string().min(1)});
export async function joinGame(actor:Actor,id:string,input:z.infer<typeof joinInput>) {
 const value=joinInput.parse(input);
 return getDb().transaction(async tx=>{
  const {game,now}=await lockGame(tx,id);const member=await activeMember(tx,actor,id);
  invariant(game.publishedAt,"FORBIDDEN","Game belum diterbitkan.",403);
  invariant(value.acceptedTermsVersion===game.termsVersion,"TERMS_CHANGED","Ketentuan berubah. Muat ulang halaman.",409);
  if(member.joinedAt) return {joinedAt:member.joinedAt};
  const status=effectiveStatus(game,now);invariant(status==='Upcoming'||status==='Live',"GAME_CLOSED","Game sudah ditutup.",410);
  const [joined]=await tx.update(participants).set({joinedAt:now,consentedAt:now,consentedTermsVersion:game.termsVersion}).where(and(eq(participants.gameId,id),eq(participants.userId,actor.id))).returning({joinedAt:participants.joinedAt});
  return joined;
 });
}
export async function finalize(tx:Transaction,game:typeof games.$inferSelect,now:Date,actor?:Actor,reason?:string) {
 if(game.completedAt)return;
 if(!game.closedAt) {
  await tx.update(games).set({closedAt:actor?now:game.endsAt,closeReason:reason??"Batas waktu berakhir",closedBy:actor?.id??null}).where(eq(games.id,game.id));
  await tx.insert(events).values({gameId:game.id,actorId:actor?.id,type:"GAME_CLOSING",createdAt:now});
 }
 // Admission and allocation are atomic. The shared lock means no accepted
 // partial work can remain when close obtains it; there is nothing to discard.
 await tx.update(games).set({completedAt:now}).where(eq(games.id,game.id));
 await tx.insert(events).values({gameId:game.id,actorId:actor?.id,type:"GAME_COMPLETED",createdAt:now});
 if(actor)await tx.insert(auditLogs).values({id:randomUUID(),adminId:actor.id,gameId:game.id,action:"GAME_ENDED",reason});
}
export async function reconcileGame(id:string) {
 // Cheap reads while Live; only a closing game needs a serialized write.
 const [candidate]=await getDb().select().from(games).where(eq(games.id,id));
 if(!candidate?.publishedAt||candidate.completedAt)return;
 const clock=await getDb().execute(sql`SELECT clock_timestamp() as now`);
 if(!candidate.closedAt&&new Date(clock.rows[0].now as string)<candidate.endsAt)return;
 await getDb().transaction(async tx=>{const {game,now}=await lockGame(tx,id);if(game.publishedAt&&!game.completedAt&&(game.closedAt||now>=game.endsAt))await finalize(tx,game,now);});
}
export async function endGame(actor:Actor,id:string,reasonInput:string) {
 adminOnly(actor);const reason=z.string().trim().min(10).max(500).parse(reasonInput);
 return getDb().transaction(async tx=>{
  const {game,now}=await lockGame(tx,id);
  if(game.closedBy)return {id,status:"Completed"};
  invariant(effectiveStatus(game,now)==='Live',"GAME_NOT_LIVE","Game hanya dapat dihentikan saat berlangsung.",409);
  await finalize(tx,game,now,actor,reason);return {id,status:"Completed"};
 });
}
export async function monitorGame(actor:Actor,id:string) {
 adminOnly(actor);await reconcileGame(id);
 const result=await getDb().execute(sql`SELECT p.user_id,u.full_name,p.joined_at FROM game_participants p JOIN users u ON u.id=p.user_id WHERE p.game_id=${id} ORDER BY u.full_name`);
 const members=result.rows.map(r=>({id:String(r.user_id),name:String(r.full_name),joinedAt:r.joined_at?new Date(r.joined_at as string):null}));
 return {whitelisted:members.length,joined:members.filter(m=>m.joinedAt).length,notJoined:members.filter(m=>!m.joinedAt).length,members};
}
