# GajiKu Local Web Server (PowerShell Native - No Node/Python required)
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")

try {
    $listener.Start()
} catch {
    # If wildcard binding requires admin, fall back to localhost
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias *Wi-Fi*, *Ethernet* -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.*" -and $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Aplikasi GajiKu (Pendataan Gaji & Overtime) Berjalan!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Akses dari Komputer ini:" -ForegroundColor Yellow
Write-Host "   👉 http://localhost:$port" -ForegroundColor White
Write-Host ""
if ($localIp) {
    Write-Host "2. Akses & Install di HP Android Anda (sama WiFi):" -ForegroundColor Yellow
    Write-Host "   👉 http://${localIp}:$port" -ForegroundColor White
    Write-Host "   (Buka link di atas lewat Chrome di HP, lalu klik 'Tambahkan ke Layar Utama' / 'Install App')" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Tekan CTRL + C di jendela ini untuk menghentikan server." -ForegroundColor DarkGray
Write-Host "----------------------------------------------------------"

# Otomatis buka di browser komputer
Start-Process "http://localhost:$port"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $urlPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath)) {
        $urlPath = "index.html"
    }

    $filePath = Join-Path $PSScriptRoot $urlPath

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = $mimeTypes[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }
        
        $response.ContentType = $contentType
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("File Not Found: $urlPath")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.OutputStream.Close()
}
