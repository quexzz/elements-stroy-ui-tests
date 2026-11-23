$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    $localNode = Join-Path $env:LOCALAPPDATA 'Programs\nodejs'
    if (Test-Path -LiteralPath (Join-Path $localNode 'node.exe')) {
        $env:Path = $localNode + ';' + $env:Path
    }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Установите Node.js 24 LTS, затем повторите запуск.' }
if (Get-Command pnpm.cmd -ErrorAction SilentlyContinue) {
    & pnpm.cmd install --frozen-lockfile
} elseif (Get-Command npx.cmd -ErrorAction SilentlyContinue) {
    & npx.cmd --yes pnpm@11.25.0 install --frozen-lockfile
} else { throw 'Требуется pnpm или npm из поставки Node.js.' }
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
try {
    if (-not $env:SHOP_LOGIN -or -not $env:SHOP_PASSWORD) {
        $credential = Get-Credential -Message 'Учебная запись elements-stroy.ru для демонстрации тестов'
        if (-not $credential) { exit 1 }
        $env:SHOP_LOGIN = $credential.UserName
        $env:SHOP_PASSWORD = $credential.GetNetworkCredential().Password
    }
    if (-not $env:SHOP_LOGIN -or -not $env:SHOP_PASSWORD) { throw 'Для демонстрации всех тестов нужны логин и пароль.' }
    $env:QA_DEMO = '1'
    $env:QA_DEMO_RUN_ID = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH-mm-ss-fffZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
    Remove-Item Env:SHOP_MANUAL_LOGIN,Env:SHOP_SESSION_FILE -ErrorAction SilentlyContinue
    & node core/run.js --headed
    $result = $LASTEXITCODE
    $report = Join-Path $PSScriptRoot "runs\$env:QA_DEMO_RUN_ID\report\index.html"
    if (Test-Path -LiteralPath $report -PathType Leaf) {
        Write-Host '07 / Сдача и приёмка — открывается Allure текущего прогона'
        Start-Process -FilePath $report
    } elseif ($result -eq 0) { throw 'Файл отчета текущего прогона отсутствует.' }
    exit $result
} finally {
    Remove-Item Env:SHOP_LOGIN,Env:SHOP_PASSWORD -ErrorAction SilentlyContinue
}
