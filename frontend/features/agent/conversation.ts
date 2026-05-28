const STORAGE_KEY = "nexushub_agent_conversation_id";

export function getAgentConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function rememberAgentConversationId(conversationId?: string | null) {
  if (typeof window === "undefined" || !conversationId) return;
  window.localStorage.setItem(STORAGE_KEY, conversationId);
}

export function clearAgentConversationId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
