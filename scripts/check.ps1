$ErrorActionPreference = "Stop"
$env:PYTHONUTF8 = "1"
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$Python = "$ProjectRoot\.venv\Scripts\python.exe"

Write-Output "[1/4] ASCII, header, contract count, and validator structure"
& $Python -m pytest "$ProjectRoot\tests\direct\test_contract_source.py" -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "[2/4] GenVM semantic lint"
& $Python "$ProjectRoot\scripts\genvm_lint_rc.py" check "$ProjectRoot\contracts\semantic_nonce.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "[3/4] Direct-mode lifecycle and safety tests"
& $Python -m pytest "$ProjectRoot\tests\direct" -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "[4/4] Deployment receipt parser tests"
& $Python -m pytest "$ProjectRoot\tests\deployment" -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "CHECK_PASS: ASCII/header, GenVM lint, direct tests, deployment parser tests"
