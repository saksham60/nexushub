import { describe, expect, it } from "vitest";
import {
  buildKnowledgeEntityEndpoint,
  buildKnowledgeGraphEndpoint,
  normalizeGraphWorkspaceId,
} from "@/features/knowledge/hooks";

describe("Knowledge graph API helpers", () => {
  it("omits the local default workspace from graph requests", () => {
    const endpoint = buildKnowledgeGraphEndpoint({
      userId: "user-1",
      workspaceId: "default",
      limit: 25,
      timeRange: "14d",
      types: ["user", "person", "email"],
      sources: ["outlook", "calendar"],
    });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(endpoint.startsWith("/api/knowledge-graph?")).toBe(true);
    expect(params.get("user_id")).toBe("user-1");
    expect(params.has("workspace_id")).toBe(false);
    expect(params.get("limit")).toBe("25");
    expect(params.get("timeRange")).toBe("14d");
    expect(params.get("types")).toBe("user,person,email");
    expect(params.get("source")).toBe("outlook,calendar");
  });

  it("keeps real workspaces for entity detail requests", () => {
    const endpoint = buildKnowledgeEntityEndpoint({
      entityId: "node/with spaces",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(endpoint).toContain("/api/knowledge-graph/entities/node%2Fwith%20spaces?");
    expect(params.get("workspace_id")).toBe("workspace-1");
  });

  it("normalizes blank and default workspaces", () => {
    expect(normalizeGraphWorkspaceId("")).toBeNull();
    expect(normalizeGraphWorkspaceId("default")).toBeNull();
    expect(normalizeGraphWorkspaceId(" workspace-1 ")).toBe("workspace-1");
  });
});
