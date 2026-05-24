const USER_ID_KEY = "nexushub:user_id";

function fallbackUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getStoredUserId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function setStoredUserId(userId: string) {
  if (typeof window === "undefined" || !userId.trim()) return;
  window.localStorage.setItem(USER_ID_KEY, userId);
}

export function clearStoredUserId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_ID_KEY);
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
