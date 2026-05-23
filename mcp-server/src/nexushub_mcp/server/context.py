from __future__ import annotations

from dataclasses import dataclass

from nexushub_mcp.approvals.approval_store import ApprovalStore
from nexushub_mcp.clients.backend_internal_client import BackendInternalClient
from nexushub_mcp.config import Settings


@dataclass(slots=True)
class NexusHubRuntime:
    settings: Settings
    approval_store: ApprovalStore
    backend_client: BackendInternalClient
