# Script Membuat ZIP Siap Jadi APK
$ProgressPreference = 'SilentlyContinue'
$destinationZip = Join-Path $PSScriptRoot "GajiKu_Siap_APK.zip"

if (Test-Path $destinationZip) {
    Remove-Item $destinationZip -Force
}

$filesToInclude = @(
    "index.html",
    "style.css",
    "app.js",
    "sw.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png"
)

$tempFolder = Join-Path $env:TEMP ("gajiku_zip_" + (Get-Random))
New-Item -ItemType Directory -Force -Path $tempFolder | Out-Null

try {
    foreach ($file in $filesToInclude) {
        $srcPath = Join-Path $PSScriptRoot $file
        if (Test-Path $srcPath) {
            Copy-Item -Path $srcPath -Destination $tempFolder -Force
        }
    }

    Compress-Archive -Path "$tempFolder\*" -DestinationPath $destinationZip -Force
    Write-Host " [BERHASIL] File ZIP berhasil dibuat: GajiKu_Siap_APK.zip" -ForegroundColor Green
    Write-Host " Anda dapat langsung mengunggah file ini ke situs pembuat APK online seperti WebIntoApp.com" -ForegroundColor Cyan
} finally {
    if (Test-Path $tempFolder) {
        Remove-Item -Path $tempFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
}
