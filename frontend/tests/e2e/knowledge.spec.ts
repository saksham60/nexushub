import { expect, test } from "@playwright/test";

test("knowledge graph renders with mocked data", async ({ page }) => {
  await page.route("**/api/knowledge-graph?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        nodes: [
          {
            id: "user-1",
            type: "user",
            label: "Nexus User",
            title: "Nexus User",
            source: "nexushub",
            metadata: { email: "me@example.com" },
            actions: [],
          },
          {
            id: "email-1",
            type: "email",
            label: "Budget follow-up",
            title: "Budget follow-up",
            source: "outlook",
            metadata: { receivedAt: "2026-06-01T10:00:00Z" },
            actions: [
              {
                label: "Draft Reply",
                canvasType: "compose_email",
                payload: { messageId: "msg-1" },
              },
            ],
          },
        ],
        links: [
          {
            id: "edge-1",
            source: "user-1",
            target: "email-1",
            type: "related_to",
            label: "Mailbox item",
            weight: 0.1,
            sourceSystem: "nexushub",
            metadata: {},
          },
        ],
        stats: {
          totalNodes: 2,
          totalEdges: 1,
          peopleCount: 1,
          emailCount: 1,
          meetingCount: 0,
          documentCount: 0,
          approvalCount: 0,
          automationCount: 0,
          topicCount: 0,
        },
        generatedAt: "2026-06-02T00:00:00Z",
        degraded: false,
        stale: false,
        sourceStatus: {
          outlook: { source: "outlook", status: "ok", count: 1 },
          calendar: { source: "calendar", status: "ok", count: 0 },
          onedrive: { source: "onedrive", status: "ok", count: 0 },
        },
        filters: {},
      }),
    });
  });

  await page.route("**/api/knowledge-graph/entities/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        entity: {
          id: "email-1",
          type: "email",
          label: "Budget follow-up",
          title: "Budget follow-up",
          source: "outlook",
          metadata: { receivedAt: "2026-06-01T10:00:00Z" },
          actions: [],
        },
        relatedEntities: [],
        timeline: [],
        suggestedActions: [],
      }),
    });
  });

  await page.goto("/knowledge");

  await expect(page.getByRole("heading", { name: "Knowledge Graph" })).toBeVisible();
  await expect(page.getByText("2 nodes, 1 connections")).toBeVisible();
  await expect(page.getByRole("button", { name: "Outlook" })).toBeVisible();
});
