from __future__ import annotations

import ast
from pathlib import Path


CONTRACT = Path("contracts/semantic_nonce.py")
RUNNER = "5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"


def test_contract_is_ascii_and_header_is_coherent_v03():
    raw = CONTRACT.read_bytes()
    source = raw.decode("ascii")
    lines = source.splitlines()
    assert lines[0] == "# v0.3.0"
    assert lines[1] == '# { "Depends": "py-genlayer:' + RUNNER + '" }'
    assert lines[2] == "import genlayer as gl"


def test_exactly_one_contract_class_and_sandboxed_meaning_validator():
    source = CONTRACT.read_text(encoding="ascii")
    tree = ast.parse(source)
    contract_classes = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for base in node.bases:
                if isinstance(base, ast.Attribute) and base.attr == "Contract":
                    contract_classes.append(node.name)
    assert contract_classes == ["SemanticNonce"]
    assert "gl.vm.run_nondet_default(" in source
    assert "gl.vm.run_nondet(" not in source
    assert "_meaning_key" in source


def test_payable_metadata_and_debit_before_transfer():
    source = CONTRACT.read_text(encoding="ascii")
    tree = ast.parse(source)
    methods = {
        node.name: ast.get_source_segment(source, node) or ""
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    assert "@gl.public.write.payable\n    def create_lease" in source
    withdraw = methods["withdraw_credit"]
    assert withdraw.find("item.amount = bigint(0)") < withdraw.find("emit_transfer")


def test_prompt_binds_policy_candidate_history_and_forbids_value_authority():
    source = CONTRACT.read_text(encoding="ascii")
    assert '"\\nallowed_prior_ids=" + ",".join(prior_ids)' in source
    assert "BEGIN UNTRUSTED POLICY" in source
    assert "BEGIN UNTRUSTED CANDIDATE" in source
    assert "Do not choose payee, amount, budget" in source
