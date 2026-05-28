import { describe, expect, it } from "vitest";
import { removeApprovalFromCommandCenterFeed } from "@/features/approvals/cache";
import { CommandCenterFeedResponse } from "@/features/command-center/types";

describe("Approval Cache Updates", () => {
  it("removes a rejected approval from the command center feed by backend id", () => {
    const feed = commandCenterFeed();

    const nextFeed = removeApprovalFromCommandCenterFeed(
      feed,
      "91211af9-ab07-4e02-95aa-737846b7b797",
    );

    expect(nextFeed?.items).toHaveLength(0);
    expect(nextFeed?.counts.approvalsPending).toBe(0);
  });

  it("removes a rejected approval from the command center feed by UI-prefixed id", () => {
    const feed = commandCenterFeed();

    const nextFeed = removeApprovalFromCommandCenterFeed(
      feed,
      "app_91211af9-ab07-4e02-95aa-737846b7b797",
    );

    expect(nextFeed?.items).toHaveLength(0);
  });
});

function commandCenterFeed(): CommandCenterFeedResponse {
  return {
    mailboxEmail: null,
    health: {
      backend: "ok",
      mcp: "ok",
      microsoft: "connected",
    },
    counts: {
      repliesNeeded: 0,
      meetingsToday: 0,
      approvalsPending: 1,
      filesToReview: 0,
      teamsMentions: 0,
      aiSuggestions: 0,
    },
    items: [
      {
        id: "app_91211af9-ab07-4e02-95aa-737846b7b797",
        type: "approval",
        title: "Draft reply to devsak36@gmail.com",
        description: "Review this draft.",
        source: "NexusHub",
        priority: "high",
        status: "pending",
        primaryActionLabel: "Review",
        metadata: {
          id: "91211af9-ab07-4e02-95aa-737846b7b797",
        },
      },
    ],
  };
}
