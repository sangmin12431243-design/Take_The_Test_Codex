const buildStorageKey = (userId: string) => `problem-edit-queue:${userId}`;
const eventName = "problem-edit-queue:changed";

function emitChange(userId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail: { userId } }));
}

export function getQueuedProblemIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(buildStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function queueProblemForEdit(userId: string, problemId: string) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...getQueuedProblemIds(userId), problemId]));
  window.localStorage.setItem(buildStorageKey(userId), JSON.stringify(next));
  emitChange(userId);
}

export function dequeueProblemForEdit(userId: string, problemId: string) {
  if (typeof window === "undefined") return;
  const next = getQueuedProblemIds(userId).filter((id) => id !== problemId);
  window.localStorage.setItem(buildStorageKey(userId), JSON.stringify(next));
  emitChange(userId);
}

export function subscribeProblemEditQueue(userId: string, listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === buildStorageKey(userId)) listener();
  };

  const onCustom = (event: Event) => {
    const customEvent = event as CustomEvent<{ userId?: string }>;
    if (customEvent.detail?.userId === userId) listener();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName, onCustom);
  };
}
