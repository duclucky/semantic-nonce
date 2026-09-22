from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone


GEN = 10**18
BUDGET = 2 * GEN
BASE_TIME = 1893456000
EXPIRY = BASE_TIME + 3600
CONTRACT_PATH = "contracts/semantic_nonce.py"
LLM_PATTERN = r"(?s).*SemanticNonce meaning judge.*"


def view(value) -> dict:
    return json.loads(value if isinstance(value, str) else str(value))


def address_text(value) -> str:
    if hasattr(value, "as_hex"):
        return value.as_hex
    return "0x" + bytes(value).hex()


def set_time(vm, timestamp: int) -> None:
    text = datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")
    vm.warp(text)
    message_module = sys.modules.get("genlayer.message")
    if message_module is not None:
        message_module.raw["datetime"] = text
        message_module.datetime = text
    gl_module = sys.modules.get("genlayer.gl")
    if gl_module is not None and getattr(gl_module, "message_raw", None) is not None:
        gl_module.message_raw["datetime"] = text


def create_lease(contract, vm, principal, agent, consumer, lease_id="lease-1", expiry=EXPIRY) -> None:
    set_time(vm, BASE_TIME)
    vm.sender = principal
    vm.value = BUDGET
    contract.create_lease(
        lease_id,
        agent,
        consumer,
        "Authorize distinct release-management actions for service alpha only.",
        expiry,
    )
    vm.value = 0


def submit(contract, vm, agent, action_id="action-1", text="Rotate service alpha signing key.") -> None:
    set_time(vm, BASE_TIME + 60)
    vm.sender = agent
    contract.submit_action("lease-1", action_id, text)


def verdict_payload(contract, action_id="action-1", **overrides) -> dict:
    lease = view(contract.get_lease("lease-1"))
    action = view(contract.get_action("lease-1", action_id))
    payload = {
        "lease_id": "lease-1",
        "action_id": action_id,
        "policy_digest": lease["policy_digest"],
        "history_digest": action["history_digest"],
        "coverage": "COMPLETE",
        "scope": "IN_SCOPE",
        "novelty": "NOVEL",
        "replay_of": "",
        "reason": "The candidate has a distinct intended operational effect.",
    }
    payload.update(overrides)
    return payload


def mock_verdict(vm, contract, action_id="action-1", **overrides) -> None:
    vm.clear_mocks()
    vm.mock_llm(LLM_PATTERN, json.dumps(json.dumps(verdict_payload(contract, action_id, **overrides))))


def review(contract, vm, caller, action_id="action-1", **overrides) -> None:
    mock_verdict(vm, contract, action_id, **overrides)
    set_time(vm, BASE_TIME + 120)
    vm.sender = caller
    contract.review_action("lease-1", action_id)


def accounting_ok(data: dict) -> bool:
    return int(data["total_received"]) == int(data["total_locked"]) + int(data["total_credits"]) + int(data["total_withdrawn"])


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
