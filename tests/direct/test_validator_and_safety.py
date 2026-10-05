from __future__ import annotations

import json

import pytest

from tests.direct.helpers import *


@pytest.mark.parametrize("change", [
    {"scope": "OUT_OF_SCOPE", "novelty": "NOT_APPLICABLE"},
    {"coverage": "INSUFFICIENT", "scope": "UNVERIFIABLE", "novelty": "UNVERIFIABLE"},
    {"lease_id": "foreign-lease"},
    {"action_id": "foreign-action"},
    {"policy_digest": "0" * 64},
    {"history_digest": "f" * 64},
    {"novelty": "REPLAY", "replay_of": "missing"},
])
def test_captured_validator_rejects_changed_critical_meaning(
    change, direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    submit(contract, direct_vm, direct_alice)
    proposal = verdict_payload(contract)
    review(contract, direct_vm, direct_owner)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(LLM_PATTERN, json.dumps(json.dumps(proposal)))
    assert direct_vm.run_validator(leader_result={**proposal, **change}) is False


def test_captured_validator_replays_meaning_and_ignores_reason_wording(
    direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    submit(contract, direct_vm, direct_alice)
    proposal = verdict_payload(contract)
    review(contract, direct_vm, direct_owner)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(LLM_PATTERN, json.dumps(json.dumps({**proposal, "reason": "A new permitted effect."})))
    assert direct_vm.run_validator(leader_result=proposal) is True
    assert direct_vm.run_validator(leader_error=Exception("leader failed")) is False


def test_captured_validator_rejects_novel_when_independent_review_finds_replay(
    direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    submit(contract, direct_vm, direct_alice)
    review(contract, direct_vm, direct_owner)
    submit(contract, direct_vm, direct_alice, "action-2", "Replace the same signing key.")
    novel = verdict_payload(contract, "action-2")
    review(contract, direct_vm, direct_owner, "action-2", novelty="REPLAY", replay_of="action-1")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(LLM_PATTERN, json.dumps(json.dumps({**novel, "novelty": "REPLAY", "replay_of": "action-1"})))
    assert direct_vm.run_validator(leader_result=novel) is False


@pytest.mark.parametrize("offset", [-1, 0, 1])
def test_review_checks_its_own_deadline_with_stale_active_phase(
    offset, direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    submit(contract, direct_vm, direct_alice)
    mock_verdict(direct_vm, contract)
    direct_vm.sender = direct_owner
    set_time(direct_vm, EXPIRY + offset)
    before = view(contract.get_accounting())
    action_before = view(contract.get_action("lease-1", "action-1"))
    if offset < 0:
        contract.review_action("lease-1", "action-1")
        assert view(contract.get_action("lease-1", "action-1"))["status"] == "AUTHORIZED"
    else:
        with pytest.raises(Exception, match="expired"):
            contract.review_action("lease-1", "action-1")
        assert view(contract.get_accounting()) == before
        assert view(contract.get_action("lease-1", "action-1")) == action_before
        assert contract.get_ticket("lease-1", "action-1") == ""


def test_wrong_actor_and_foreign_lease_cannot_reuse_authorized_bytes(
    direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    create_lease(contract, direct_vm, direct_owner, direct_bob, direct_alice, lease_id="lease-2")
    before = view(contract.get_accounting())
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="named agent"):
        contract.submit_action("lease-2", "action-1", "Rotate service alpha signing key.")
    assert view(contract.get_accounting()) == before
    assert view(contract.get_lease("lease-2"))["action_count"] == 0
    submit(contract, direct_vm, direct_alice)
    assert view(contract.get_lease("lease-1"))["action_count"] == 1
    assert view(contract.get_lease("lease-2"))["action_count"] == 0


def test_retry_limit_preserves_purse_and_expiry_recovers_all_unused_gen(
    direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    submit(contract, direct_vm, direct_alice)
    for _ in range(2):
        review(contract, direct_vm, direct_owner, coverage="INSUFFICIENT", scope="UNVERIFIABLE", novelty="UNVERIFIABLE")
    before = view(contract.get_accounting())
    with pytest.raises(Exception, match="attempt limit"):
        contract.review_action("lease-1", "action-1")
    assert view(contract.get_accounting()) == before
    set_time(direct_vm, EXPIRY)
    contract.close_expired("lease-1")
    assert view(contract.get_credit(direct_owner))["amount"] == str(BUDGET)
    assert view(contract.get_accounting())["total_locked"] == "0"
    assert contract.get_ticket("lease-1", "action-1") == ""
    contract.withdraw_credit()
    assert view(contract.get_accounting())["total_credits"] == "0"
    assert accounting_ok(view(contract.get_accounting()))


def test_empty_lease_refund_and_withdrawal_have_no_orphaned_value(
    direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    set_time(direct_vm, EXPIRY + 1)
    direct_vm.sender = direct_owner
    contract.close_expired("lease-1")
    assert view(contract.get_credit(direct_owner))["amount"] == str(BUDGET)
    contract.withdraw_credit()
    assert view(contract.get_accounting()) == {
        "total_received": str(BUDGET), "total_locked": "0",
        "total_credits": "0", "total_withdrawn": str(BUDGET),
    }
    with pytest.raises(Exception, match="no credit"):
        contract.withdraw_credit()


@pytest.mark.parametrize("offset", [-1, 0, 1])
def test_creation_expiry_lower_boundary_has_no_rejected_value_mutation(
    offset, direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    set_time(direct_vm, BASE_TIME)
    direct_vm.sender = direct_owner
    direct_vm.value = BUDGET
    before = view(contract.get_accounting())
    if offset > 0:
        contract.create_lease("lease-1", direct_alice, direct_bob, "policy", BASE_TIME + offset)
        assert view(contract.get_lease("lease-1"))["locked"] == str(BUDGET)
    else:
        with pytest.raises(Exception, match="future"):
            contract.create_lease("lease-1", direct_alice, direct_bob, "policy", BASE_TIME + offset)
        assert view(contract.get_accounting()) == before
        with pytest.raises(Exception, match="not found"):
            contract.get_lease("lease-1")


@pytest.mark.parametrize("offset", [-1, 0, 1])
def test_creation_thirty_day_upper_boundary_is_inclusive(
    offset, direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    expiry = BASE_TIME + 30 * 24 * 60 * 60 + offset
    if offset <= 0:
        create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob, expiry=expiry)
        assert view(contract.get_lease("lease-1"))["expires_at"] == str(expiry)
    else:
        before = view(contract.get_accounting())
        with pytest.raises(Exception, match="30 day"):
            create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob, expiry=expiry)
        assert view(contract.get_accounting()) == before


def test_principal_cannot_withdraw_the_agents_credit(
    direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT_PATH)
    create_lease(contract, direct_vm, direct_owner, direct_alice, direct_bob)
    submit(contract, direct_vm, direct_alice)
    review(contract, direct_vm, direct_owner)
    before = view(contract.get_accounting())
    direct_vm.sender = direct_owner
    with pytest.raises(Exception, match="no credit"):
        contract.withdraw_credit()
    assert view(contract.get_accounting()) == before
    assert view(contract.get_credit(direct_alice))["amount"] == str(GEN)
