from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT = "semantic-nonce"
CATEGORY = "intelligent-contracts"
ADDRESS = "0xD7CE68322ba69D2e4629A5F5801E560C34BdDD96"
EXPLORER = f"https://explorer-studio-dev.genlayer.com/address/{ADDRESS}"
REPO = "https://github.com/duclucky/semantic-nonce"
DESCRIPTION_CHARS = 861


def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True, stderr=subprocess.STDOUT).strip()


def main() -> int:
    blockers: list[str] = []
    contract_path = ROOT / "contracts" / "semantic_nonce.py"
    deployment_path = ROOT / "docs" / "evidence" / "studio-dev" / "deployment.json"
    lifecycle_path = ROOT / "docs" / "evidence" / "studio-dev" / "lifecycle.json"
    submission_path = ROOT / "docs" / "SUBMISSION.md"
    try:
        contract = contract_path.read_bytes()
        source = contract.decode("ascii")
        tree = ast.parse(source)
        classes = [
            node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)
            and any(isinstance(base, ast.Attribute) and base.attr == "Contract" for base in node.bases)
        ]
        if classes != ["SemanticNonce"]:
            blockers.append("contract class invariant")
        if "gl.vm.run_nondet_default(" not in source or "_meaning_key" not in source:
            blockers.append("meaning validator structure")
        if "@gl.evm.contract_interface" not in source or "gl.chain.Account" in source:
            blockers.append("EOA transfer boundary")
    except Exception as error:
        blockers.append(f"contract source invalid: {error}")
        contract = b""
    try:
        deployment = json.loads(deployment_path.read_text(encoding="utf-8"))
        lifecycle = json.loads(lifecycle_path.read_text(encoding="utf-8"))
        if deployment.get("network") != "studio-dev" or deployment.get("chainId") != 61997:
            blockers.append("deployment network")
        if deployment.get("contractAddress", "").lower() != ADDRESS.lower() or deployment.get("explorerUrl") != EXPLORER:
            blockers.append("active deployment identity")
        if deployment.get("status") != "FINALIZED" or deployment.get("deploy", {}).get("executionResult") != "FINISHED_WITH_RETURN":
            blockers.append("deployment finalization/result")
        if deployment.get("sourceDirtyAtDeployment") is not False:
            blockers.append("deployment source was dirty")
        if deployment.get("sourceSha256") != hashlib.sha256(contract).hexdigest():
            blockers.append("deployed source hash differs from current contract")
        if lifecycle.get("contractAddress", "").lower() != ADDRESS.lower() or lifecycle.get("phase") != "EXHAUSTED":
            blockers.append("terminal lifecycle identity/state")
        expected = {
            "rotate-key": ("AUTHORIZED", ""),
            "replace-key": ("REPLAY_DENIED", "rotate-key"),
            "publish-notes": ("AUTHORIZED", ""),
        }
        decisions = lifecycle.get("decisions", {})
        for action_id, (status, replay_of) in expected.items():
            item = decisions.get(action_id, {})
            if item.get("status") != status or item.get("replayOf") != replay_of:
                blockers.append(f"lifecycle decision {action_id}")
        if lifecycle.get("tickets") != {"rotate-key": "CONSUMED", "publish-notes": "CONSUMED"}:
            blockers.append("ticket lifecycle")
        expected_accounting = {
            "totalReceived": "2 GEN", "totalLocked": "0 GEN",
            "totalCredits": "0 GEN", "totalWithdrawn": "2 GEN",
        }
        if lifecycle.get("accounting") != expected_accounting or lifecycle.get("agentCreditAfterWithdrawal") != "0 GEN":
            blockers.append("lifecycle accounting")
    except Exception as error:
        blockers.append(f"network evidence invalid: {error}")
    if (ROOT / "frontend").exists():
        blockers.append("NO-APP violation: frontend exists")
    if not submission_path.exists():
        blockers.append("submission fields missing")
    else:
        submission = submission_path.read_text(encoding="utf-8")
        marker = "## Description\n\n"
        description = submission.split(marker, 1)[1].split("\n\n## Evidence URL", 1)[0] if marker in submission else ""
        if len(description) != DESCRIPTION_CHARS or len(description) >= 1000:
            blockers.append(f"submission description count is {len(description)}, expected {DESCRIPTION_CHARS}")
    try:
        top = Path(run("git", "rev-parse", "--show-toplevel")).resolve()
        if top != ROOT.resolve():
            blockers.append("git root is not project child")
        if run("git", "status", "--porcelain"):
            blockers.append("working tree is dirty")
        tracked = run("git", "ls-files").splitlines()
        forbidden = (".env", "AGENTS.md", "CLAUDE.md", ".codex/", "frontend/", "source-notes/", "research/", "references/", "templates/")
        bad = [name for name in tracked if name == ".env" or any(name.startswith(prefix) for prefix in forbidden[1:])]
        if bad:
            blockers.append("forbidden tracked paths: " + ", ".join(bad))
        remote = run("git", "remote", "get-url", "origin")
        normalized_remote = remote[:-4] if remote.endswith(".git") else remote
        if normalized_remote != REPO:
            blockers.append("public repository remote")
        repo_data = json.loads(run("gh", "repo", "view", "duclucky/semantic-nonce", "--json", "isPrivate,url,defaultBranchRef"))
        if repo_data.get("isPrivate") is not False or repo_data.get("url") != REPO:
            blockers.append("GitHub repository is not verified public")
        runs = json.loads(run("gh", "run", "list", "--workflow", "check.yml", "--branch", "main", "--limit", "1", "--json", "status,conclusion,headSha"))
        head = run("git", "rev-parse", "HEAD")
        if not runs or runs[0].get("headSha") != head or runs[0].get("status") != "completed" or runs[0].get("conclusion") != "success":
            blockers.append("current-commit GitHub Actions check is not successful")
    except Exception as error:
        blockers.append(f"git/public CI verification: {error}")
    print(f"Project {PROJECT} -Category {CATEGORY} -ExplorerUrl {EXPLORER}")
    if blockers:
        for blocker in blockers:
            print(f"BLOCKER: {blocker}")
        return 1
    print("NO BLOCKER")
    return 0


if __name__ == "__main__":
    sys.exit(main())
