Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$size,
        [string]$outputPath
    )
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(30, 58, 138)
    $c2 = [System.Drawing.Color]::FromArgb(37, 99, 235)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
    $g.FillRectangle($brush, $rect)

    # Inner Card Shape
    $cardW = [int]($size * 0.65)
    $cardH = [int]($size * 0.45)
    $cardX = [int](($size - $cardW) / 2)
    $cardY = [int](($size - $cardH) / 2)
    $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($cardBrush, $cardX, $cardY, $cardW, $cardH)

    # Accent Overtime Circle
    $accW = [int]($size * 0.18)
    $accX = [int]($cardX + $cardW - ($accW * 0.8))
    $accY = [int]($cardY + ($cardH - $accW) / 2)
    $accBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 163, 74))
    $g.FillEllipse($accBrush, $accX, $accY, $accW, $accW)

    # Text Rp
    $fontSize = [int]($size * 0.14)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 58, 138))
    $g.DrawString('Rp', $font, $textBrush, [float]($cardX + 12), [float]($cardY + ($cardH - $fontSize * 1.5) / 2))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Icon -size 192 -outputPath "$PSScriptRoot\icon-192.png"
Generate-Icon -size 512 -outputPath "$PSScriptRoot\icon-512.png"
Write-Host "Icons generated successfully"
