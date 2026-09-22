from __future__ import annotations

import pytest

from scripts.deployment_receipts import normalize_receipt


HASH = "0x" + "ab" * 32
ADDRESS = "0x" + "12" * 20


def test_normalizes_raw_studio_receipt_without_private_fields():
    result = normalize_receipt({
        "hash": HASH,
        "recipient": ADDRESS,
        "statusName": "FINALIZED",
        "txExecutionResultName": "FINISHED_WITH_RETURN",
        "node_config": {"private": "must not be projected"},
    })
    assert result == {
        "transactionHash": HASH,
        "contractAddress": ADDRESS,
        "status": "FINALIZED",
        "executionResult": "FINISHED_WITH_RETURN",
    }


def test_normalizes_sdk_nested_receipt_shape():
    result = normalize_receipt({
        "status": "finalized",
        "txExecutionResult": "accepted",
        "result": {"transactionHash": HASH, "contractAddress": ADDRESS},
    })
    assert result["transactionHash"] == HASH
    assert result["contractAddress"] == ADDRESS
    assert result["status"] == "finalized"
    assert result["executionResult"] == "accepted"


@pytest.mark.parametrize("field,value", [("hash", "0x1234"), ("contractAddress", "0xdead")])
def test_rejects_malformed_identifiers(field, value):
    with pytest.raises(ValueError):
        normalize_receipt({field: value})
