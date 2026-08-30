$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$src = Join-Path $projectRoot 'assets\series\tuanyuanyuan'
$dst = Join-Path $projectRoot 'tools\thumbs'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Get-ChildItem -LiteralPath $dst -Filter '*.jpg' -ErrorAction SilentlyContinue | Remove-Item -Force

$files = Get-ChildItem -LiteralPath $src -Filter '*.jpg' | Sort-Object Name
foreach ($f in $files) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $scale = 340 / [double][math]::Max($img.Width, $img.Height)
  $w = [int][math]::Round($img.Width * $scale)
  $h = [int][math]::Round($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()
  $bmp.Save((Join-Path $dst $f.Name), [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $bmp.Dispose(); $img.Dispose()
}
Write-Output ("thumbs: " + $files.Count)
