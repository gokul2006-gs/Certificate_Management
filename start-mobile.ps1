$lanIp = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
)

if (-not $lanIp) {
    Write-Host "Could not detect a LAN IP. Connect to Wi-Fi and run again."
    exit 1
}

$frontendUrl = "http://$lanIp:5173"
$apiUrl = "http://$lanIp:8000/api"

Write-Host ""
Write-Host "Mobile QR setup"
Write-Host "---------------"
Write-Host "LAN IP:        $lanIp"
Write-Host "Frontend URL:  $frontendUrl"
Write-Host "API URL:       $apiUrl"
Write-Host ""
Write-Host "1. Phone and PC must be on the same Wi-Fi."
Write-Host "2. Allow Python and Node through Windows Firewall if prompted."
Write-Host "3. After upload, scan QR on phone -> opens verify page."
Write-Host ""

Set-Content -Path "frontend\.env.mobile" -Value @(
    "VITE_API_URL=$apiUrl"
    "VITE_PORT=5173"
)

$env:FRONTEND_BASE_URL = $frontendUrl

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PSScriptRoot\backend'; `$env:FRONTEND_BASE_URL='$frontendUrl'; python manage.py runserver 0.0.0.0:8000"
)

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PSScriptRoot\frontend'; npm run dev:mobile"
)

Write-Host "Started backend and frontend in new windows."
Write-Host "Open on phone: $frontendUrl"
Write-Host "Regenerate old QR codes with: cd backend; `$env:FRONTEND_BASE_URL='$frontendUrl'; python manage.py regenerate_qr_codes"
