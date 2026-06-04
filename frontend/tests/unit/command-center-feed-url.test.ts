import { describe, expect, it } from "vitest";
import { buildCommandCenterFeedEndpoint } from "@/features/command-center/hooks/useActionQueue";

describe("Command Center feed URL", () => {
  it("includes user id and browser timezone", () => {
    const endpoint = buildCommandCenterFeedEndpoint("user-1", "America/New_York");
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(endpoint.startsWith("/api/command-center/feed?")).toBe(true);
    expect(params.get("user_id")).toBe("user-1");
    expect(params.get("timezone")).toBe("America/New_York");
  });

  it("normalizes the legacy Calcutta timezone alias", () => {
    const endpoint = buildCommandCenterFeedEndpoint("user-1", "Asia/Calcutta");
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(params.get("timezone")).toBe("Asia/Kolkata");
  });
});
