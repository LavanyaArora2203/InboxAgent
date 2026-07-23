"""
state.py

Single shared state for the complete Email Automation workflow — every
agent, guardrail, and memory node reads from and writes to this one
TypedDict as it flows through graph.py.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, NotRequired, Optional, TypedDict

# agents/*.py use flat internal imports (e.g. "from llm import llm",
# "from planner import PlannedEmail") rather than "agents.llm" / "agents.planner".
# That only resolves if the agents/ directory itself is on sys.path, in
# addition to the project root. Adding it once, here, covers every import
# of agents.* anywhere in the project (state.py is always imported first).
_AGENTS_DIR = Path(__file__).resolve().parent / "agents"
if str(_AGENTS_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENTS_DIR))

from agents.classifier import ClassifiedEmail
from agents.email_understanding import EmailInfo
from agents.executor import ExecutedEmail
from agents.planner import PlannedEmail
from agents.priority import PrioritizedEmail
from memory.extractor import MemoryCandidate
from memory.models import MemoryRecord


class EmailWorkflowState(TypedDict):
    """Shared LangGraph state for the complete Email Automation workflow."""

    # ============================================================
    # Workflow configuration / identity
    # ============================================================

    max_results: int
    query: Optional[str]

    # Keys memory retrieval/storage by user. Defaults to "default_user" in
    # memory/nodes.py if not set — for real multi-user deployments, set this
    # per request (e.g. from an authenticated session) before invoking the
    # graph.
    user_id: NotRequired[str]

    # ============================================================
    # Gmail Fetch Tool Output
    # ============================================================

    raw_emails: list[dict]

    # ============================================================
    # Email Understanding Agent
    # ============================================================

    structured_emails: list[EmailInfo]

    # ============================================================
    # Classification Agent
    # ============================================================

    classified_emails: list[ClassifiedEmail]

    # ============================================================
    # Priority Agent
    # ============================================================

    prioritized_emails: list[PrioritizedEmail]

    # ============================================================
    # Memory (memory/nodes.py)
    # ============================================================

    # Populated by retrieve_memory_node before the Planner Agent runs, so
    # the planner can personalize its plan against known preferences, etc.
    retrieved_memories: NotRequired[list[MemoryRecord]]

    # Populated by memory_guard_node after Execute: candidates the LLM
    # extracted and MemoryGuard approved as safe/worth storing.
    memory_candidates: NotRequired[list[MemoryCandidate]]

    # Populated by memory_manager_node: the records that were actually
    # persisted to short-term/long-term (SQLite) storage.
    stored_memories: NotRequired[list[MemoryRecord]]

    # ============================================================
    # Planner Agent
    # ============================================================

    planned_emails: list[PlannedEmail]

    # ============================================================
    # Executor Agent
    # ============================================================

    executed_emails: list[ExecutedEmail]

    # ============================================================
    # Guardrails (guardrails/*)
    # ============================================================

    # Per-email cross-cutting flags guards record here instead of setting
    # undeclared attributes on the Pydantic models — see
    # guardrails/base.py::set_guardrail_flags for why.
    # Shape: { email_id: {flag_name: value, ...}, ... }
    guardrail_flags: NotRequired[dict[str, dict[str, Any]]]

    # Set by the run_guard() wrapper in graph.py after every guard call —
    # used for conditional routing (e.g. halting after a critical
    # InputGuard failure).
    _last_guard_decision: NotRequired[str]
    _last_guard_name: NotRequired[str]

    # ============================================================
    # Workflow status
    # ============================================================

    errors: list[str]


def build_initial_state(
    max_results: int = 10,
    query: Optional[str] = None,
    user_id: str = "default_user",
) -> EmailWorkflowState:
    """Helper to construct a clean starting state for a pipeline run."""
    return {
        "max_results": max_results,
        "query": query,
        "user_id": user_id,
        "raw_emails": [],
        "structured_emails": [],
        "classified_emails": [],
        "prioritized_emails": [],
        "retrieved_memories": [],
        "memory_candidates": [],
        "stored_memories": [],
        "planned_emails": [],
        "executed_emails": [],
        "guardrail_flags": {},
        "errors": [],
    }













# ##state.py

# from typing import Optional, TypedDict

# from agents.email_understanding import EmailInfo
# from agents.classifier import ClassifiedEmail
# from agents.priority import PrioritizedEmail
# from agents.planner import PlannedEmail
# from agents.executor import ExecutedEmail


# class EmailWorkflowState(TypedDict):
#     """
#     Shared LangGraph state for the complete Email Automation workflow.
#     """

#     # ============================================================
#     # Workflow Configuration
#     # ============================================================

#     max_results: int
#     query: Optional[str]

#     # ============================================================
#     # Gmail Fetch Tool Output
#     # ============================================================

#     raw_emails: list[dict]

#     # ============================================================
#     # Email Understanding Agent
#     # ============================================================

#     structured_emails: list[EmailInfo]

#     # ============================================================
#     # Classification Agent
#     # ============================================================

#     classified_emails: list[ClassifiedEmail]

#     # ============================================================
#     # Priority Agent
#     # ============================================================

#     prioritized_emails: list[PrioritizedEmail]

#     # ============================================================
#     # Planner Agent
#     # ============================================================

#     planned_emails: list[PlannedEmail]

#     # ============================================================
#     # Executor Agent
#     # ============================================================

#     executed_emails: list[ExecutedEmail]

#     # ============================================================
#     # Workflow Status
#     # ============================================================

#     errors: list[str]