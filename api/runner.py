"""
api/runner.py

Builds the checkpointed, interruptible version of the workflow graph (pauses
before tool_permission_guard so the API can collect human approvals), and
runs it in a background thread pool since graph.invoke() is synchronous.

Checkpointer choice:
    Dev/default: InMemorySaver — state lives only as long as the process runs.
    Production:  swap in SqliteSaver (or a Postgres-backed saver) so runs
                 survive a server restart. One-line change, see below.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer

# The checkpointer serializes the full EmailWorkflowState between steps —
# including the Pydantic model instances it holds directly (EmailInfo,
# ClassifiedEmail, PlannedEmail, etc.), not just plain dicts. LangGraph's
# serializer requires those modules to be explicitly allow-listed, or a
# future version will refuse to deserialize them. Add any new agent module
# that defines a Pydantic model stored in EmailWorkflowState to this list.
_serde = JsonPlusSerializer(
    allowed_msgpack_modules=[
        ("agents.email_understanding", "Attachment"),
        ("agents.email_understanding", "Participant"),
        ("agents.email_understanding", "EmailInfo"),
        ("agents.classifier", "Classification"),
        ("agents.classifier", "ClassifiedEmail"),
        ("agents.priority", "Priority"),
        ("agents.priority", "PrioritizedEmail"),
        ("agents.planner", "ActionPlan"),
        ("agents.planner", "PlannedEmail"),
        ("agents.executor", "ExecutionResult"),
        ("agents.executor", "PendingSend"),
        ("agents.executor", "ExecutedEmail"),
        ("memory.models", "MemoryRecord"),
        ("memory.extractor", "MemoryCandidate"),
    ]
)

# For production durability, swap the two lines above/below for:
#   from langgraph.checkpoint.sqlite import SqliteSaver
#   _checkpointer = SqliteSaver.from_conn_string("workflow_checkpoints.db")
# (SqliteSaver's from_conn_string is a context manager in some versions —
# check langgraph-checkpoint-sqlite's docs for your installed version. Pass
# `serde=_serde` to it the same way as below.)
_checkpointer = InMemorySaver(serde=_serde)

from graph import build_email_workflow

# The graph used by the API — pauses right before tool_permission_guard so
# approvals can be collected before any high-stakes action is stripped or
# (once approved) allowed to run.
api_workflow = build_email_workflow(
    checkpointer=_checkpointer,
    interrupt_before=["tool_permission_guard"],
)

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=4)

# run_id -> {"error": str | None} — graph.get_state() gives us most status
# info; this just tracks whether the background thread raised.
_run_errors: dict[str, str] = {}


def config_for(run_id: str) -> dict:
    return {"configurable": {"thread_id": run_id}}


def start_run(run_id: str, initial_state: dict) -> None:
    """Kick off a new run in the background. Returns immediately."""
    _executor.submit(_invoke_safely, run_id, initial_state)


def resume_run(run_id: str) -> None:
    """Resume a paused run (after approvals have been applied via update_state)."""
    _executor.submit(_invoke_safely, run_id, None)


def _invoke_safely(run_id: str, input_state) -> None:
    try:
        api_workflow.invoke(input_state, config=config_for(run_id))
        _run_errors.pop(run_id, None)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Run %s failed", run_id)
        _run_errors[run_id] = str(exc)


def get_run_error(run_id: str) -> str | None:
    return _run_errors.get(run_id)


def get_state(run_id: str):
    """Returns the LangGraph StateSnapshot for this run, or None if unknown."""
    snapshot = api_workflow.get_state(config_for(run_id))
    if snapshot.values == {}:
        return None
    return snapshot


def derive_status(run_id: str) -> str:
    if get_run_error(run_id):
        return "error"

    snapshot = get_state(run_id)
    if snapshot is None:
        return "error"  # unknown run_id — caller should 404 before this is reached

    if not snapshot.next:
        return "completed"

    if "tool_permission_guard" in snapshot.next:
        return "awaiting_approval"

    return "processing"
