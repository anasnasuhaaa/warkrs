"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { RoomGame } from "@/components/domain/game-room";
import type { WireResult } from "@/components/domain/ranking";
export type Activity = {
  id: string;
  type: string;
  createdAt: string;
  actorName: string | null;
  packageName: string | null;
  rank: number | null;
  sequence: number | null;
};
export type Snapshot = {
  game: RoomGame;
  packages: {
    id: string;
    name: string;
    capacity: number;
    allocated: number;
    remaining: number;
  }[];
  counts: {
    whitelisted: number;
    joined: number;
    notJoined: number;
    submitted: number;
    allocated: number;
  };
  cursor: string;
  ownSubmission: WireResult | null;
  realtimeMode: "sse" | "polling";
};
export function useGameUpdates(initial: RoomGame, admin = false) {
  const [game, setGame] = useState(initial);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<Activity[]>([]);
  const [connection, setConnection] = useState("Menghubungkan…");
  const current = useRef(initial);
  const cursor = useRef("0");
  const running = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const failures = useRef(0);
  const catchingUp = useRef(false);
  const refresh = useCallback(async () => {
    if (running.current) return running.current;
    const task = (async () => {
      try {
        if (!navigator.onLine) {
          throw new Error("OFFLINE");
        }
        if (current.current.joinedAt || admin) {
          const data = await api<Snapshot>(`/api/games/${initial.id}/snapshot`);
          if (!alive.current) return;
          current.current = data.game;
          setGame(data.game);
          setSnapshot(data);
          const collected: Activity[] = [];
          let more = true;
          let nextCursor = cursor.current;
          for (let pages = 0; more && pages < 20; pages++) {
            const page = await api<{
              items: Activity[];
              cursor: string;
              hasMore: boolean;
            }>(`/api/games/${initial.id}/events?after=${nextCursor}&limit=100`);
            if (!alive.current) return;
            collected.push(...page.items);
            nextCursor = page.cursor;
            more = page.hasMore;
          }
          cursor.current = nextCursor;
          catchingUp.current = more;
          if (collected.length)
            setEvents((old) => {
              const ids = new Set(old.map((e) => e.id));
              return [...old, ...collected.filter((e) => !ids.has(e.id))];
            });
        } else {
          const detail = await api<RoomGame>(`/api/games/${initial.id}`);
          if (!alive.current) return;
          current.current = detail;
          setGame(detail);
        }
        failures.current = 0;
        setConnection("Tersinkron dengan server");
      } catch {
        if (alive.current) {
          failures.current++;
          setConnection(
            navigator.onLine
              ? "Menyambung kembali… Data mungkin tertinggal."
              : "Offline. Menunggu koneksi kembali.",
          );
        }
      }
    })();
    running.current = task;
    try {
      await task;
    } finally {
      if (running.current === task) running.current = null;
    }
  }, [initial.id, admin]);
  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function tick() {
      if (stopped || document.hidden) return;
      await refresh();
      if (
        !stopped &&
        (current.current.status !== "Completed" ||
          failures.current > 0 ||
          catchingUp.current)
      )
        timer = setTimeout(
          tick,
          catchingUp.current
            ? 100
            : Math.min(30000, 4000 * 2 ** Math.min(failures.current, 3)),
        );
    }
    function resume() {
      clearTimeout(timer);
      if (!document.hidden) void tick();
    }
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    void tick();
    return () => {
      stopped = true;
      alive.current = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
    };
  }, [refresh]);
  useEffect(() => {
    if (
      snapshot?.realtimeMode !== "sse" ||
      game.status === "Completed" ||
      document.hidden
    )
      return;
    const source = new EventSource(
      `/api/games/${initial.id}/events/stream?after=${cursor.current}`,
    );
    source.addEventListener("activity", () => void refresh());
    source.addEventListener("reconnect", () => void refresh());
    source.onerror = () => {
      source.close();
      void refresh();
    };
    return () => source.close();
  }, [snapshot?.realtimeMode, game.status, initial.id, refresh]);
  return { game, snapshot, events, connection, refresh };
}
