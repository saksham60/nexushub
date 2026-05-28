from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    agent,
    automations,
    approvals,
    auth_microsoft,
    command_center,
    documents,
    health,
    internal_approvals,
    internal_graph,
    mail,
    tools,
)
from app.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="NexusHub Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth_microsoft.router)
app.include_router(agent.router)
app.include_router(automations.router)
app.include_router(command_center.router)
app.include_router(documents.router)
app.include_router(documents.internal_router)
app.include_router(tools.router)
app.include_router(mail.router)
app.include_router(mail.router, prefix="/api")
app.include_router(mail.internal_router)
app.include_router(approvals.router)
app.include_router(internal_graph.router)
app.include_router(internal_approvals.router)
