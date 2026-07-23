"""
graph.py

Builds the complete Email Automation LangGraph workflow by wiring together
the node functions already defined in agents/, guardrails/, and memory/.
This file does not redefine any agent/guard/memory logic — it only
sequences existing nodes and adapts between them where their internal
naming differs from the shared EmailWorkflowState (see `category_node`).

Sequence (per workflow.txt / memory_management.txt):

    fetch_email -> input_guard -> [BLOCK? -> END]
                -> prompt_injection_guard -> understand -> category
                -> confidence_guard -> priority -> retrieve_memory
                -> planner -> action_list -> planner_guard
                -> tool_permission_guard -> tool_argument_guard
                -> execute -> pii_guard -> output_guard -> audit_guard
                -> memory_guard -> [worth remembering? -> memory_manager] -> END

Human approval: rather than a hard pause mid-graph, approval is enforced by
tool_permission_guard, which strips any action requiring approval
(reply/forward/delete/schedule_meeting) unless
state["guardrail_flags"][email_id]["human_approved"] is already True (set
by an external approval endpoint before this graph runs). See
guardrails/tool_permission_guard.py's docstring. A future upgrade could
replace this with a real LangGraph `interrupt()` checkpoint instead.

Run:
    python graph.py
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

# See state.py for why this is needed — agents/*.py use flat internal
# imports, so agents/ must be on sys.path in addition to the project root.
# state.py already does this shim, and it always gets imported before the
# agents.* imports below run, but it's repeated here defensively in case
# graph.py is ever imported before state.py for any reason.
_AGENTS_DIR = Path(__file__).resolve().parent / "agents"
if str(_AGENTS_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENTS_DIR))

from langgraph.graph import END, START, StateGraph

from state import EmailWorkflowState, build_initial_state

from agents.classifier import classify_node
from agents.email_understanding import extract_info_node, fetch_emails_node
from agents.executor import execute_actions_node
from agents.planner import propose_actions_node, validate_actions_node
from agents.priority import prioritize_node

from guardrails import (
    AuditGuard,
    BaseGuardrail,
    ConfidenceGuard,
    InputGuard,
    OutputGuard,
    PIIGuard,
    PlannerGuard,
    PromptInjectionGuard,
    ToolArgumentGuard,
    ToolPermissionGuard,
)

from memory import (
    memory_guard_node,
    memory_manager_node,
    retrieve_memory_node,
    should_run_memory_manager,
)

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Adapter: agents/classifier.py's classify_node reads its input from an
# "emails" key (its own ClassifierState), but EmailWorkflowState stores the
# same list under "structured_emails". This wrapper bridges the two without
# modifying classifier.py itself.
# --------------------------------------------------------------------------


def category_node(state: EmailWorkflowState) -> EmailWorkflowState:
    sub_state = {**state, "emails": state.get("structured_emails", [])}
    result = classify_node(sub_state)
    return {
        **state,
        "classified_emails": result.get("classified_emails", []),
        "errors": result.get("errors", state.get("errors", [])),
    }


# --------------------------------------------------------------------------
# Generic guard wrapper: runs any BaseGuardrail against the shared state and
# folds its updated_state back in, recording the decision for routing.
# --------------------------------------------------------------------------


def make_guard_node(guard: BaseGuardrail):
    def _node(state: EmailWorkflowState) -> EmailWorkflowState:
        result = guard.run(state)
        new_state = dict(result.updated_state) if result.updated_state is not None else dict(state)
        new_state["_last_guard_decision"] = result.decision.value
        new_state["_last_guard_name"] = result.guardrail_name or guard.name

        logger.info("[%s] %s — %s", guard.name, result.decision.value, result.reason)
        if result.metadata:
            logger.debug("[%s] metadata: %s", guard.name, result.metadata)

        return new_state

    return _node


# Guard instances (some hold state, e.g. AuditGuard owns an AuditLogger —
# instantiate once and reuse rather than creating fresh per run).
_input_guard = InputGuard()
_prompt_injection_guard = PromptInjectionGuard()
_confidence_guard = ConfidenceGuard()
_planner_guard = PlannerGuard()
_tool_permission_guard = ToolPermissionGuard()
_tool_argument_guard = ToolArgumentGuard()
_pii_guard = PIIGuard()
_output_guard = OutputGuard()
_audit_guard = AuditGuard()


# --------------------------------------------------------------------------
# Conditional routing
# --------------------------------------------------------------------------


def route_after_input_guard(state: EmailWorkflowState) -> str:
    """Only InputGuard's BLOCK is fatal (bad batch / Gmail API error) — every
    other guard filters/flags individual emails but lets the batch continue."""
    if state.get("_last_guard_decision") == "block":
        logger.error("InputGuard blocked the batch: %s", state.get("errors"))
        return "end"
    return "continue"


def route_after_memory_guard(state: EmailWorkflowState) -> str:
    return "memory_manager" if should_run_memory_manager(state) else "end"


# --------------------------------------------------------------------------
# Graph assembly
# --------------------------------------------------------------------------


def build_email_workflow(checkpointer=None, interrupt_before: list[str] | None = None):
    """
    Build and compile the graph.

    checkpointer: pass a LangGraph checkpointer (e.g. InMemorySaver for dev,
        SqliteSaver/AsyncSqliteSaver for durable state) to make the graph
        resumable across process calls, keyed by config["configurable"]["thread_id"].
        Required if you use interrupt_before — a graph can't pause and later
        resume without somewhere to persist its state in between.

    interrupt_before: list of node names to pause before. The API layer uses
        interrupt_before=["tool_permission_guard"] so the whole run pauses
        right after planner_guard determines which emails need approval,
        and before tool_permission_guard would otherwise silently strip
        unapproved high-stakes actions. See api/runner.py.
    """
    graph = StateGraph(EmailWorkflowState)

    # --- Fetch ---
    graph.add_node("fetch_email", fetch_emails_node)

    # --- Input-stage guards ---
    graph.add_node("input_guard", make_guard_node(_input_guard))
    graph.add_node("prompt_injection_guard", make_guard_node(_prompt_injection_guard))

    # --- Understand -> Category -> Priority ---
    graph.add_node("understand", extract_info_node)
    graph.add_node("category", category_node)
    graph.add_node("confidence_guard", make_guard_node(_confidence_guard))
    graph.add_node("priority", prioritize_node)

    # --- Memory retrieval (before planning, for personalization) ---
    graph.add_node("retrieve_memory", retrieve_memory_node)

    # --- Planner + its own internal guardrail, then the external one ---
    graph.add_node("planner", propose_actions_node)
    graph.add_node("action_list", validate_actions_node)
    graph.add_node("planner_guard", make_guard_node(_planner_guard))

    # --- Tool-stage guards (this is where approval gets enforced) ---
    graph.add_node("tool_permission_guard", make_guard_node(_tool_permission_guard))
    graph.add_node("tool_argument_guard", make_guard_node(_tool_argument_guard))

    # --- Execute ---
    graph.add_node("execute", execute_actions_node)

    # --- Output-stage guards ---
    graph.add_node("pii_guard", make_guard_node(_pii_guard))
    graph.add_node("output_guard", make_guard_node(_output_guard))
    graph.add_node("audit_guard", make_guard_node(_audit_guard))

    # --- Memory guard + manager ---
    graph.add_node("memory_guard", memory_guard_node)
    graph.add_node("memory_manager", memory_manager_node)

    # ---------------- Edges ----------------

    graph.add_edge(START, "fetch_email")
    graph.add_edge("fetch_email", "input_guard")

    graph.add_conditional_edges(
        "input_guard",
        route_after_input_guard,
        {"continue": "prompt_injection_guard", "end": END},
    )

    graph.add_edge("prompt_injection_guard", "understand")
    graph.add_edge("understand", "category")
    graph.add_edge("category", "confidence_guard")
    graph.add_edge("confidence_guard", "priority")
    graph.add_edge("priority", "retrieve_memory")
    graph.add_edge("retrieve_memory", "planner")
    graph.add_edge("planner", "action_list")
    graph.add_edge("action_list", "planner_guard")
    graph.add_edge("planner_guard", "tool_permission_guard")
    graph.add_edge("tool_permission_guard", "tool_argument_guard")
    graph.add_edge("tool_argument_guard", "execute")
    graph.add_edge("execute", "pii_guard")
    graph.add_edge("pii_guard", "output_guard")
    graph.add_edge("output_guard", "audit_guard")
    graph.add_edge("audit_guard", "memory_guard")

    graph.add_conditional_edges(
        "memory_guard",
        route_after_memory_guard,
        {"memory_manager": "memory_manager", "end": END},
    )
    graph.add_edge("memory_manager", END)

    return graph.compile(checkpointer=checkpointer, interrupt_before=interrupt_before or [])


email_workflow = build_email_workflow()


def run_email_workflow(
    max_results: int = 10,
    query: str | None = None,
    user_id: str = "default_user",
) -> EmailWorkflowState:
    """Entry point: runs the full workflow end-to-end and returns the final state."""
    initial_state = build_initial_state(max_results=max_results, query=query, user_id=user_id)
    return email_workflow.invoke(initial_state)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    result = run_email_workflow(max_results=5)

    print("\n=== Executed Emails ===")
    print(json.dumps([e.model_dump() for e in result.get("executed_emails", [])], indent=2, default=str))

    print("\n=== Stored Memories ===")
    print(json.dumps([m.model_dump() for m in result.get("stored_memories", [])], indent=2, default=str))

    if result.get("errors"):
        print("\n=== Errors ===")
        print(result["errors"])
