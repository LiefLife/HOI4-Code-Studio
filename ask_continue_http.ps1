
param (
    [string]$reason = "任务已完成",
    [string]$workspace = "d:\\Code\\Rust\\HOI4-Code-Studio"
)

# 读取端口
$portFile = Join-Path $workspace ".continuous_dialog_port"
if (Test-Path $portFile) {
    if ($IsWindows) {
        $port = Get-Content $portFile -Raw -ErrorAction SilentlyContinue | Out-String
    } else {
        $port = Get-Content $portFile -Raw
    }
    $port = $port.Trim()
} else {
    $port = "34695"
}

$body = @{
    jsonrpc = "2.0"
    id = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    method = "tools/call"
    params = @{
        name = "continuous_dialog"
        arguments = @{
            reason = $reason
            workspace = $workspace
        }
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:$port" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 300
    Write-Output ($response.result.content[0].text)
} catch {
    Write-Error "调用对话框服务失败: $_"
}
