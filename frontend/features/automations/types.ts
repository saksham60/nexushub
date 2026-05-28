export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  status: "available" | "active" | "disabled";
};

export type AutomationRun = {
  id: string;
  templateId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  finishedAt?: string;
};

export type AutomationsResponse = {
  status: "ok";
  templates: AutomationTemplate[];
  active: AutomationTemplate[];
  runs: AutomationRun[];
};
