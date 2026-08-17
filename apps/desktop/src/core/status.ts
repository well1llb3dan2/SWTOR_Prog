export interface ClientStatusLike {
  sessionId: string | null;
  queuedEvents: number;
  droppedEvents: number;
}

export function mergeClientMetrics<T extends ClientStatusLike>(
  status: T,
  client: { sessionId: string; queuedEvents: number; droppedEvents: number } | null,
): T {
  return {
    ...status,
    sessionId: client?.sessionId ?? null,
    queuedEvents: client?.queuedEvents ?? status.queuedEvents,
    droppedEvents: client?.droppedEvents ?? status.droppedEvents,
  };
}
