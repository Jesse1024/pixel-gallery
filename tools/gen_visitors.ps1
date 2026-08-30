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
$legend['H'] = C 106 82 64
$legend['S'] = C 245 220 196
$legend['E'] = C 43 58 74
$legend['C'] = C 74 106 110
$legend['P'] = C 58 64 86
$legend['T'] = C 34 38 50

$head = @(
"..HHHHHHHH..",
".HHHHHHHHHH.",
".HSSSSSSSSH.",
"..SESSSSES..",
"..SSSSSSSS..",
"...SSSSSS...",
"..CCCCCCCC..",
".CCCCCCCCCC.",
".CCCCCCCCCC.",
".CCCCCCCCCC.",
"..CCCCCCCC..",
"..PPPPPPPP.."
)

$visA = $head + @(
"..PPP..PPP..",
"..PPP..PPP..",
"..PPP..PPP..",
"..TTT..TTT..",
".TTTT..TTTT."
)

$visB = $head + @(
"...PPPPPP...",
"...PPPPPP...",
"....PPPP....",
"....TTTT....",
"...TTTTTT..."
)

Sprite $visA $legend (Join-Path $assetDir 'visitor-a.png')
Sprite $visB $legend (Join-Path $assetDir 'visitor-b.png')
Write-Output 'OK'
