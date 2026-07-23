"""
api/schemas.py — request/response models for the workflow API.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class RunRequest(BaseModel):
    max_results: int = 10
    query: str | None = None
    user_id: str = "default_user"


class RunResponse(BaseModel):
    run_id: str
    status: Literal["processing", "awaiting_approval", "completed", "error"]


class RunStatusResponse(BaseModel):
    run_id: str
    status: Literal["processing", "awaiting_approval", "completed", "error"]
    total_emails: int
    pending_approval_count: int
    error: str | None = None


class PendingApprovalItem(BaseModel):
    email_id: str
    subject: str
    sender: str
    category: str
    priority: str
    proposed_actions: list[str]
    reasoning: str


class ApprovalDecision(BaseModel):
    email_id: str
    approved: bool


class ApproveRequest(BaseModel):
    decisions: list[ApprovalDecision]


class ExecutedEmailSummary(BaseModel):
    email_id: str
    subject: str
    sender: str
    category: str
    priority: str
    actions_taken: list[str]
    requires_human_approval: bool
    pending_send: dict[str, Any] | None = None


class RunResultResponse(BaseModel):
    run_id: str
    status: Literal["processing", "awaiting_approval", "completed", "error"]
    executed_emails: list[ExecutedEmailSummary]
    stored_memories_count: int
    errors: list[str]
