from __future__ import annotations

from typing import Any


def _first(mapping: dict[str, Any], *names: str) -> Any:
    for name in names:
        value = mapping.get(name)
        if value not in (None, ""):
            return value
    return None


def _is_hex(value: str, digits: int) -> bool:
    return value.startswith("0x") and len(value) == digits + 2 and all(
        char in "0123456789abcdefABCDEF" for char in value[2:]
    )


def normalize_receipt(payload: dict[str, Any]) -> dict[str, str]:
    """Project only public proof fields from raw or SDK receipt shapes."""
    if not isinstance(payload, dict):
        raise ValueError("receipt must be an object")
    nested = payload.get("result") if isinstance(payload.get("result"), dict) else {}
    deployment = payload.get("deployment") if isinstance(payload.get("deployment"), dict) else {}
    address = _first(payload, "contractAddress", "recipient", "to")
    if address is None:
        address = _first(nested, "contractAddress", "recipient")
    if address is None:
        address = _first(deployment, "contractAddress")
    tx_hash = _first(payload, "transactionHash", "hash", "txHash")
    if tx_hash is None:
        tx_hash = _first(nested, "transactionHash", "hash")
    status = _first(payload, "statusName", "status", "finalityStatus")
    execution = _first(payload, "txExecutionResultName", "txExecutionResult", "executionResult")
    result = {
        "transactionHash": str(tx_hash or ""),
        "contractAddress": str(address or ""),
        "status": str(status or ""),
        "executionResult": str(execution or ""),
    }
    if result["transactionHash"] and not _is_hex(result["transactionHash"], 64):
        raise ValueError("invalid transaction hash")
    if result["contractAddress"] and not _is_hex(result["contractAddress"], 40):
        raise ValueError("invalid contract address")
    return result
