const USER_ID_KEY = "nexushub:user_id";
let memoryUserId: string | null = null;

function fallbackUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getStoredUserId() {
  if (typeof window === "undefined") return memoryUserId;
  try {
    return window.localStorage.getItem(USER_ID_KEY) || memoryUserId;
  } catch {
    return memoryUserId;
  }
}

export function setStoredUserId(userId: string) {
  if (!userId.trim()) return;
  memoryUserId = userId;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_ID_KEY, userId);
  } catch {
    // Some embedded/private browser modes disable localStorage. Memory fallback is enough for MVP.
  }
}

export function clearStoredUserId() {
  memoryUserId = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_ID_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function ensureUserId() {
  const existing = getStoredUserId();
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : fallbackUuid();
  setStoredUserId(generated);
  return generated;
}

export function getRequestIdentity() {
  return {
    user_id: ensureUserId(),
    workspace_id: null,
  };
}

export function syncUserIdFromCallbackUrl() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const userId = url.searchParams.get("user_id");
  if (!userId) return null;

  setStoredUserId(userId);
  url.searchParams.delete("user_id");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return userId;
}
