$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $projectRoot 'assets'

function C { param([int]$r,[int]$g,[int]$b) [System.Drawing.Color]::FromArgb($r,$g,$b) }

function Sprite { param($map,$leg,$path)
  $h = $map.Count; $w = $map[0].Length
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $w,$h
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $ch = [string]$map[$y][$x]
      if ($leg.ContainsKey($ch) -and ($null -ne $leg[$ch])) { $bmp.SetPixel($x,$y,$leg[$ch]) }
    }
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$legend = [System.Collections.Hashtable]::new([System.StringComparer]::Ordinal)
$legend['.'] = $null
$legend['B'] = C 69 76 92
$legend['W'] = C 242 237 218
$legend['E'] = C 232 168 124

$catA = @(
".B.....B.",
".BB...BB.",
".BBBBBBB.",
".BEBBBEB.",
".BBBBBBB.",
"..BWWWB..",
".BBWWWBB.",
".BBWWWBB.",
".BBBBBBB.",
".BBBBBBB.",
".BB...BB."
)

$catB = @(
".B.....B.",
".BB...BB.",
".BBBBBBB.",
".BBBBBBB.",
".BBBBBBB.",
"..BWWWB..",
".BBWWWBB.",
".BBWWWBB.",
".BBBBBBB.",
".BBBBBBB.",
".BB...BB."
)

Sprite $catA $legend (Join-Path $assetDir 'cat-a.png')
Sprite $catB $legend (Join-Path $assetDir 'cat-b.png')
Write-Output 'OK'
