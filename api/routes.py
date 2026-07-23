"""
api/routes.py

Endpoints:
    POST /workflows/run                    start a new run
    GET  /workflows/{run_id}/status         poll run status
    GET  /workflows/{run_id}/approvals      list emails awaiting approval
    POST /workflows/{run_id}/approve        submit approve/reject decisions, resumes the run
    GET  /workflows/{run_id}/result         final (or partial) results
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException

from guardrails.base import planned_email_id
from state import build_initial_state

from . import runner
from .schemas import (
    ApproveRequest,
    ExecutedEmailSummary,
    PendingApprovalItem,
    RunRequest,
    RunResponse,
    RunResultResponse,
    RunStatusResponse,
)

router = APIRouter(prefix="/workflows", tags=["workflows"])


def _get_snapshot_or_404(run_id: str):
    snapshot = runner.get_state(run_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return snapshot


# --------------------------------------------------------------------------
# Start a run
# --------------------------------------------------------------------------


@router.post("/run", response_model=RunResponse)
def start_workflow_run(request: RunRequest) -> RunResponse:
    run_id = str(uuid.uuid4())
    initial_state = build_initial_state(
        max_results=request.max_results, query=request.query, user_id=request.user_id
    )
    runner.start_run(run_id, initial_state)
    return RunResponse(run_id=run_id, status="processing")


# --------------------------------------------------------------------------
# Status
# --------------------------------------------------------------------------


@router.get("/{run_id}/status", response_model=RunStatusResponse)
def get_run_status(run_id: str) -> RunStatusResponse:
    status = runner.derive_status(run_id)

    if status == "error" and runner.get_run_error(run_id) is None:
        # derive_status returns "error" for genuinely unknown run_ids too
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    snapshot = runner.get_state(run_id)
    values = snapshot.values if snapshot else {}

    planned = values.get("planned_emails", [])
    flags = values.get("guardrail_flags", {})
    pending_count = sum(
        1 for item in planned
        if flags.get(planned_email_id(item), {}).get("requires_human_approval")
    )

    return RunStatusResponse(
        run_id=run_id,
        status=status,
        total_emails=len(values.get("structured_emails", [])),
        pending_approval_count=pending_count,
        error=runner.get_run_error(run_id),
    )


# --------------------------------------------------------------------------
# Pending approvals
# --------------------------------------------------------------------------


@router.get("/{run_id}/approvals", response_model=list[PendingApprovalItem])
def get_pending_approvals(run_id: str) -> list[PendingApprovalItem]:
    snapshot = _get_snapshot_or_404(run_id)
    values = snapshot.values
    flags = values.get("guardrail_flags", {})

    items = []
    for item in values.get("planned_emails", []):
        email_id = planned_email_id(item)
        if not flags.get(email_id, {}).get("requires_human_approval"):
            continue

        email_info = item.prioritized_email.classified_email.email_info
        items.append(
            PendingApprovalItem(
                email_id=email_id,
                subject=email_info.subject,
                sender=f"{email_info.sender.name or ''} <{email_info.sender.email}>".strip(),
                category=item.prioritized_email.classified_email.classification.category,
                priority=item.prioritized_email.priority.level,
                proposed_actions=item.action_plan.actions,
                reasoning=item.action_plan.reasoning,
            )
        )

    return items


# --------------------------------------------------------------------------
# Approve / reject + resume
# --------------------------------------------------------------------------


@router.post("/{run_id}/approve", response_model=RunResponse)
def submit_approvals(run_id: str, request: ApproveRequest) -> RunResponse:
    snapshot = _get_snapshot_or_404(run_id)

    if runner.derive_status(run_id) != "awaiting_approval":
        raise HTTPException(
            status_code=400,
            detail=f"Run '{run_id}' is not awaiting approval (current status: "
            f"{runner.derive_status(run_id)})",
        )

    # guardrail_flags has no reducer, so update_state() replaces it wholesale —
    # merge the existing dict in Python first, don't just send the deltas.
    flags = dict(snapshot.values.get("guardrail_flags", {}))
    for decision in request.decisions:
        flags.setdefault(decision.email_id, {})
        flags[decision.email_id] = {**flags[decision.email_id], "human_approved": decision.approved}

    runner.api_workflow.update_state(
        runner.config_for(run_id), {"guardrail_flags": flags}
    )
    runner.resume_run(run_id)

    return RunResponse(run_id=run_id, status="processing")


# --------------------------------------------------------------------------
# Result
# --------------------------------------------------------------------------


@router.get("/{run_id}/result", response_model=RunResultResponse)
def get_run_result(run_id: str) -> RunResultResponse:
    snapshot = _get_snapshot_or_404(run_id)
    values = snapshot.values
    status = runner.derive_status(run_id)

    executed_summaries = []
    for item in values.get("executed_emails", []):
        email_info = item.planned_email.prioritized_email.classified_email.email_info
        classification = item.planned_email.prioritized_email.classified_email.classification
        priority = item.planned_email.prioritized_email.priority

        executed_summaries.append(
            ExecutedEmailSummary(
                email_id=email_info.email_id,
                subject=email_info.subject,
                sender=f"{email_info.sender.name or ''} <{email_info.sender.email}>".strip(),
                category=classification.category,
                priority=priority.level,
                actions_taken=item.planned_email.action_plan.actions,
                requires_human_approval=item.requires_human_approval,
                pending_send=item.pending_send.model_dump() if item.pending_send else None,
            )
        )

    return RunResultResponse(
        run_id=run_id,
        status=status,
        executed_emails=executed_summaries,
        stored_memories_count=len(values.get("stored_memories", [])),
        errors=values.get("errors", []),
    )
