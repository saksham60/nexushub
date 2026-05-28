from typing import Literal, Any
from pydantic import BaseModel, Field

NodeType = Literal[
    "user",
    "person",
    "email",
    "meeting",
    "document",
    "approval",
    "automation",
    "team",
    "topic",
    "project"
]

NodeSource = Literal[
    "outlook",
    "calendar",
    "teams",
    "onedrive",
    "sharepoint",
    "nexushub",
    "system"
]

Priority = Literal["high", "medium", "low"]
CanvasType = Literal[
    "compose_email",
    "schedule_meeting",
    "document_intelligence",
    "approval_review",
    "automation",
    "none"
]

class NodeAction(BaseModel):
    label: str
    canvasType: CanvasType
    payload: dict[str, Any] = Field(default_factory=dict)

class KnowledgeNode(BaseModel):
    id: str
    type: NodeType
    label: str
    title: str | None = None
    subtitle: str | None = None
    source: NodeSource
    priority: Priority | None = None
    status: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    actions: list[NodeAction] = Field(default_factory=list)

EdgeType = Literal[
    "sent_by",
    "received_by",
    "attended_by",
    "mentions",
    "attached_to",
    "related_to",
    "modified_by",
    "requires_approval",
    "created_from",
    "part_of_project",
    "follow_up_for",
    "acts_on",
    "created_by"
]

class KnowledgeEdge(BaseModel):
    id: str
    source: str
    target: str
    type: EdgeType
    label: str | None = None
    weight: float = 1.0
    sourceSystem: NodeSource
    metadata: dict[str, Any] = Field(default_factory=dict)

class GraphStats(BaseModel):
    totalNodes: int
    totalEdges: int
    peopleCount: int
    emailCount: int
    meetingCount: int
    documentCount: int
    approvalCount: int
    automationCount: int | None = None
    topicCount: int | None = None

class KnowledgeGraphResponse(BaseModel):
    nodes: list[KnowledgeNode] = Field(default_factory=list)
    links: list[KnowledgeEdge] = Field(default_factory=list)
    stats: GraphStats
    generatedAt: str
    degraded: bool = False
    message: str | None = None

class KnowledgeEntityDetails(BaseModel):
    entity: KnowledgeNode
    relatedEntities: list[KnowledgeNode] = Field(default_factory=list)
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    suggestedActions: list[dict[str, Any]] = Field(default_factory=list)
