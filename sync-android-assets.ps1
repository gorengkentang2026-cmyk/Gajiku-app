# Script Sinkronisasi Aset Web ke Android Project (Kotlin)
$destDir = "$PSScriptRoot\android\app\src\main\assets\www"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$filesToCopy = @(
    "index.html",
    "style.css",
    "app.js",
    "sw.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png"
)

foreach ($f in $filesToCopy) {
    $src = Join-Path $PSScriptRoot $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $destDir -Force
        Write-Host " [OK] Tersinkron: $f" -ForegroundColor Green
    }
}

Write-Host "`nSemua file web berhasil disalin ke: android/app/src/main/assets/www" -ForegroundColor Cyan
