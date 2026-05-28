export type NodeType =
  | "user"
  | "person"
  | "email"
  | "meeting"
  | "document"
  | "approval"
  | "automation"
  | "team"
  | "topic"
  | "project";

export type NodeSource =
  | "outlook"
  | "calendar"
  | "teams"
  | "onedrive"
  | "sharepoint"
  | "nexushub"
  | "system";

export type CanvasType =
  | "compose_email"
  | "schedule_meeting"
  | "document_intelligence"
  | "approval_review"
  | "automation"
  | "none";

export interface NodeAction {
  label: string;
  canvasType: CanvasType;
  payload: Record<string, unknown>;
}

export interface KnowledgeNode {
  id: string;
  type: NodeType;
  label: string;
  title?: string;
  subtitle?: string;
  source: NodeSource;
  priority?: "high" | "medium" | "low";
  status?: string;
  metadata: Record<string, unknown>;
  actions?: NodeAction[];
}

export type EdgeType =
  | "sent_by"
  | "received_by"
  | "attended_by"
  | "mentions"
  | "attached_to"
  | "related_to"
  | "modified_by"
  | "requires_approval"
  | "created_from"
  | "part_of_project"
  | "follow_up_for"
  | "acts_on"
  | "created_by";

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  weight: number;
  sourceSystem: NodeSource;
  metadata: Record<string, unknown>;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  peopleCount: number;
  emailCount: number;
  meetingCount: number;
  documentCount: number;
  approvalCount: number;
  automationCount?: number;
  topicCount?: number;
}

export interface KnowledgeGraphResponse {
  nodes: KnowledgeNode[];
  links: KnowledgeEdge[];
  stats: GraphStats;
  generatedAt: string;
  degraded?: boolean;
  message?: string;
}

export interface KnowledgeEntityDetails {
  entity: KnowledgeNode;
  relatedEntities: KnowledgeNode[];
  timeline: Record<string, unknown>[];
  suggestedActions: NodeAction[];
}
