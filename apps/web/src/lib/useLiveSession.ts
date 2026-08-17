"use client";

import type { MeterSnapshot } from "@swtor/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./apiBase";

export type LiveStatus = "connecting" | "live" | "waiting" | "disconnected" | "error";

export interface CompletedPull {
  reportCode: string;
  fightId: number;
  outcome: "kill" | "wipe" | "incomplete";
  durationMs: number;
  encounter: { encounterId: string; encounterName: string } | null;
}

export interface LiveSession {
  status: LiveStatus;
  snapshot: MeterSnapshot | null;
  history: CompletedPull[];
  error: string | null;
}

const API_URL = API_BASE_URL;

/**
 * Subscribes to a session's live meter feed.
 *
 * State is driven by whole snapshots rather than individual combat events, so
 * React re-renders once per server tick no matter how busy the fight is.
 */
export function useLiveSession(sessionId: string): LiveSession {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [snapshot, setSnapshot] = useState<MeterSnapshot | null>(null);
  const [history, setHistory] = useState<CompletedPull[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const snapshotTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionId.length === 0) return;

    const socket = io(`${API_URL}/live`, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setError(null);
      socket.emit("subscribe", sessionId, (ack: { ok: boolean }) => {
        setStatus(ack?.ok ? "waiting" : "error");
        if (!ack?.ok) setError("Could not subscribe to that session");
      });
    });

    const clearSnapshotGrace = () => {
      if (snapshotTimeoutRef.current !== null) {
        clearTimeout(snapshotTimeoutRef.current);
      }
      snapshotTimeoutRef.current = window.setTimeout(() => {
        setSnapshot(null);
      }, 2_500);
    };

    socket.on("snapshot", (next: MeterSnapshot) => {
      if (next.sessionId !== sessionId) return;
      if (snapshotTimeoutRef.current !== null) {
        clearTimeout(snapshotTimeoutRef.current);
        snapshotTimeoutRef.current = null;
      }
      setSnapshot(next);
      setStatus("live");
    });

    socket.on("pull:complete", (pull: CompletedPull) => {
      setStatus("waiting");
      setHistory((previous) => [pull, ...previous].slice(0, 50));
      clearSnapshotGrace();
    });

    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", (cause: Error) => {
      setStatus("error");
      setError(cause.message);
    });

    return () => {
      if (snapshotTimeoutRef.current !== null) {
        clearTimeout(snapshotTimeoutRef.current);
      }
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId]);

  return useMemo(() => ({ status, snapshot, history, error }), [status, snapshot, history, error]);
}
