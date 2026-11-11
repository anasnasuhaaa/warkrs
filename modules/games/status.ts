export type GameStatus =
  "Draft" | "Upcoming" | "Live" | "Closing" | "Completed";
export type TimedGame = {
  publishedAt: Date | null;
  startsAt: Date;
  endsAt: Date;
  closedAt: Date | null;
  completedAt: Date | null;
};
export function effectiveStatus(game: TimedGame, now: Date): GameStatus {
  if (!game.publishedAt) return "Draft";
  if (game.completedAt) return "Completed";
  if (game.closedAt || now >= game.endsAt) return "Closing";
  return now < game.startsAt ? "Upcoming" : "Live";
}
export const statusLabel: Record<GameStatus, string> = {
  Draft: "Draf",
  Upcoming: "Akan datang",
  Live: "Berlangsung",
  Closing: "Menutup",
  Completed: "Selesai",
};
