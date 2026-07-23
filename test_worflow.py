"""
test_integration.py — drop this in your project root.

Verifies:
    1. every package imports cleanly
    2. guardrails' action vocabulary matches agents/planner.py's ActionType
       (this is the exact class of bug found and fixed earlier — this test
       exists specifically so it can't silently regress)
    3. memory (SQLite-backed) round-trips correctly
    4. MemoryGuard blocks sensitive keys/values
    5. the full graph compiles with the expected node sequence
    6. a full pipeline run (fetch -> execute, with every LLM/Gmail call
       mocked) completes end-to-end with no errors

Run:
    pytest test_integration.py -v
"""

from __future__ import annotations

import typing
from unittest.mock import MagicMock, patch

import pytest

import state  # noqa: F401  (triggers the sys.path shim agents/*.py needs)


# --------------------------------------------------------------------------
# 1. Imports
# --------------------------------------------------------------------------


def test_all_packages_import_cleanly():
    import agents.classifier  # noqa: F401
    import agents.email_understanding  # noqa: F401
    import agents.executor  # noqa: F401
    import agents.llm  # noqa: F401
    import agents.memory_extractor  # noqa: F401
    import agents.planner  # noqa: F401
    import agents.priority  # noqa: F401
    import audit  # noqa: F401
    import graph  # noqa: F401
    import guardrails  # noqa: F401
    import memory  # noqa: F401
    import tools  # noqa: F401


# --------------------------------------------------------------------------
# 2. Action vocabulary consistency (regression test for the original bug)
# --------------------------------------------------------------------------


def test_guardrail_action_vocabulary_matches_planner():
    from agents.planner import ActionType
    from guardrails.config import GuardrailConfig

    planner_actions = set(typing.get_args(ActionType))
    guard_actions = GuardrailConfig.ALLOWED_ACTIONS

    missing_from_guard = planner_actions - guard_actions
    extra_in_guard = guard_actions - planner_actions

    assert not missing_from_guard, (
        f"planner.py has actions guardrails/config.py doesn't recognize: {missing_from_guard}"
    )
    assert not extra_in_guard, (
        f"guardrails/config.py allows actions planner.py never produces: {extra_in_guard}"
    )


def test_tool_registry_covers_every_non_control_action():
    from agents.planner import ActionType
    from guardrails.config import GuardrailConfig

    planner_actions = set(typing.get_args(ActionType)) - {"human_approval"}
    registry_actions = set(GuardrailConfig.TOOL_REGISTRY.keys())

    assert planner_actions == registry_actions, (
        f"TOOL_REGISTRY doesn't match ActionType: "
        f"missing={planner_actions - registry_actions} extra={registry_actions - planner_actions}"
    )


# --------------------------------------------------------------------------
# 3 & 4. Memory
# --------------------------------------------------------------------------


def test_memory_roundtrip(tmp_path, monkeypatch):
    import memory.long_term as lt
    from memory.enums import MemoryCategory, MemoryType
    from memory.manager import MemoryManager
    from memory.models import MemoryRecord

    monkeypatch.setattr(lt, "DEFAULT_DB_PATH", tmp_path / "test_ltm.db")

    mgr = MemoryManager()
    record = MemoryRecord(
        user_id="u1", memory_type=MemoryType.LONG_TERM,
        category=MemoryCategory.PREFERENCE, key="reply_tone", value="formal",
    )
    mgr.store(record)

    results = mgr.retrieve("u1")
    assert len(results) == 1
    assert results[0].value == "formal"

    mgr.delete(record.id)
    assert mgr.retrieve("u1") == []


def test_memory_guard_blocks_sensitive_data():
    from memory.memory_guard import MemoryGuard

    guard = MemoryGuard()
    assert guard.should_store("password", "hunter2") is False
    assert guard.should_store("note", "card is 4111 1111 1111 1111") is False
    assert guard.should_store("reply_tone", "formal") is True


# --------------------------------------------------------------------------
# 5. Graph shape
# --------------------------------------------------------------------------


def test_graph_has_expected_nodes():
    import graph as g

    nodes = set(g.email_workflow.get_graph().nodes.keys())
    expected = {
        "fetch_email", "input_guard", "prompt_injection_guard", "understand",
        "category", "confidence_guard", "priority", "retrieve_memory",
        "planner", "action_list", "planner_guard", "tool_permission_guard",
        "tool_argument_guard", "execute", "pii_guard", "output_guard",
        "audit_guard", "memory_guard", "memory_manager",
    }
    missing = expected - nodes
    assert not missing, f"graph.py is missing expected nodes: {missing}"


# --------------------------------------------------------------------------
# 6. Full pipeline, mocked
# --------------------------------------------------------------------------


def test_full_pipeline_runs_end_to_end(monkeypatch, tmp_path):
    import agents.classifier as clf
    import agents.email_understanding as eu
    import agents.planner as pl
    import agents.priority as pr
    import graph as g
    import memory.long_term as lt
    import state as st
    from agents.classifier import Classification
    from agents.planner import ActionPlan
    from agents.priority import Priority

    monkeypatch.setattr(lt, "DEFAULT_DB_PATH", tmp_path / "test_ltm.db")

    sample_raw = [{
        "id": "t1", "thread_id": "t1", "sender": "Alice <alice@example.com>",
        "subject": "Weekly digest", "date": "Mon, 20 Jul 2026",
        "snippet": "x", "body": "This week's top stories.",
    }]

    mock_extraction = MagicMock(
        is_reply=False, body_text="This week's top stories.", summary="Weekly digest email.",
        detected_language="en", contains_links=False, links=[],
        mentioned_dates_times=[], mentioned_entities=[], question_present=False,
    )

    with patch("agents.email_understanding.fetch_unread_emails") as mock_fetch, \
         patch.object(eu, "_structured_extractor") as mock_ext, \
         patch.object(clf, "_structured_classifier") as mock_clf, \
         patch.object(pr, "_structured_priority") as mock_pr, \
         patch.object(pl, "_structured_planner") as mock_pl:

        mock_fetch.invoke.return_value = sample_raw
        mock_ext.invoke.return_value = mock_extraction
        mock_clf.invoke.return_value = Classification(
            category="Newsletter", confidence=0.95, reasoning="Clearly a newsletter."
        )
        # mock_pr.invoke.return_value = Priority(level="Low", reasoning="No action needed.")
        mock_pr.invoke.return_value = Priority(
    level="Low",
    reasoning="No action needed.",
    requires_reply=False,
        )
        mock_pl.invoke.return_value = ActionPlan(actions=["archive"], reasoning="Routine newsletter.")

        result = g.email_workflow.invoke(st.build_initial_state(max_results=5))

    assert result["errors"] == [], f"Pipeline produced errors: {result['errors']}"
    assert len(result["executed_emails"]) == 1

    executed = result["executed_emails"][0]
    assert executed.planned_email.action_plan.actions == ["archive"]
    assert executed.requires_human_approval is False


if __name__ == "__main__":
    import sys

    sys.exit(pytest.main([__file__, "-v"]))

