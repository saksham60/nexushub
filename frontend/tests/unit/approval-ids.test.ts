import { describe, expect, it } from "vitest";
import { normalizeApprovalId } from "@/features/approvals/ids";

describe("Approval ID Normalizer", () => {
  it("strips action item prefixes before approval API calls", () => {
    const approvalId = "91211af9-ab07-4e02-95aa-737846b7b797";

    expect(normalizeApprovalId(`app_${approvalId}`)).toBe(approvalId);
    expect(normalizeApprovalId(`APP_${approvalId}`)).toBe(approvalId);
    expect(normalizeApprovalId(`approval_${approvalId}`)).toBe(approvalId);
    expect(normalizeApprovalId(`approval:${approvalId}`)).toBe(approvalId);
  });

  it("returns an empty string for missing ids", () => {
    expect(normalizeApprovalId(undefined)).toBe("");
    expect(normalizeApprovalId(null)).toBe("");
    expect(normalizeApprovalId("")).toBe("");
  });
});
