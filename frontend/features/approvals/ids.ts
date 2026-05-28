const APPROVAL_ID_PREFIX_PATTERN = /^(app_|approval_|approval:)/i;

export function normalizeApprovalId(value: unknown): string {
  const rawApprovalId = String(value ?? "").trim();
  if (!rawApprovalId) return "";
  return rawApprovalId.replace(APPROVAL_ID_PREFIX_PATTERN, "");
}
