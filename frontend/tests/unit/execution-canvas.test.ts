import { describe, expect, it } from "vitest";
import { inferCanvasFromPrompt } from "@/features/agent/executionCanvas";

describe("Execution Canvas Intent", () => {
  it("opens compose email canvas for actionable email prompts", () => {
    const request = inferCanvasFromPrompt("Send an email to devsak36@gmail.com about the Q3 budget approval");

    expect(request?.type).toBe("email");
    expect(request?.payload.recipients).toEqual(["devsak36@gmail.com"]);
    expect(request?.item.title).toContain("devsak36@gmail.com");
  });

  it("opens meeting canvas for schedule prompts", () => {
    const request = inferCanvasFromPrompt("Schedule a meeting with Alex tomorrow at 2 PM");

    expect(request?.type).toBe("meeting");
    expect(request?.item.type).toBe("calendar");
  });

  it("opens document intelligence canvas for document analysis prompts", () => {
    const request = inferCanvasFromPrompt("Analyze the Q3 strategy deck and pull related Teams discussions");

    expect(request?.type).toBe("document");
    expect(request?.item.title).toBe("Document Intelligence");
  });

  it("opens automation canvas for automation prompts", () => {
    const request = inferCanvasFromPrompt("Create an automation to monitor urgent budget approvals");

    expect(request?.type).toBe("automation");
  });
});
