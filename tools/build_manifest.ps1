$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $PSScriptRoot 'series-config.json'
$outDir = Join-Path $projectRoot 'assets\series'
$dataPath = Join-Path $projectRoot 'js\photos-data.js'
$statePath = Join-Path $PSScriptRoot 'import-state.json'
$maxSide = 1800
$quality = 88

$cfg = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json

$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1

$webCaps = @{}
$webCapsPath = Join-Path $projectRoot 'tools\captions.json'
if (Test-Path -LiteralPath $webCapsPath) {
  (Get-Content -LiteralPath $webCapsPath -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $webCaps[$_.Name] = [string]$_.Value }
}

$existingSeries = @()
if (Test-Path -LiteralPath $dataPath) {
  $raw = Get-Content -LiteralPath $dataPath -Raw -Encoding UTF8
  $start = $raw.IndexOf('[')
  $end = $raw.LastIndexOf(']')
  if ($start -ge 0 -and $end -gt $start) {
    $parsed = ConvertFrom-Json $raw.Substring($start, $end - $start + 1)
    while ($parsed -is [System.Array] -and @($parsed).Count -eq 1 -and @($parsed)[0] -is [System.Array]) {
      $parsed = @($parsed)[0]
    }
    $existingSeries = @($parsed)
  }
}

$state = @{}
if (Test-Path -LiteralPath $statePath) {
  $stateObj = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($stateObj) { $stateObj.PSObject.Properties | ForEach-Object { $state[$_.Name] = @($_.Value) } }
}

function Save-Jpeg { param($bmp,$path,[int]$q)
  $ep = New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList ([System.Drawing.Imaging.Encoder]::Quality), ([long]$q)
  $bmp.Save($path, $jpegEncoder, $ep)
  $ep.Dispose()
}

function Read-Rational { param($bytes,[int]$offset)
  $num = [BitConverter]::ToUInt32($bytes,$offset)
  $den = [BitConverter]::ToUInt32($bytes,$offset+4)
  if ($den -eq 0) { return 0 }
  return $num / $den
}

function Read-Ascii { param($pi) ([System.Text.Encoding]::ASCII.GetString($pi.Value)).Trim([char]0).Trim() }

function Get-ExifInfo { param($img,$file)
  $info = @{}
  foreach ($pi in $img.PropertyItems) {
    switch ($pi.Id) {
      0x0110 { $info.camera = Read-Ascii $pi }
      0xA434 { $info.lens = Read-Ascii $pi }
      0x829D { $v = Read-Rational $pi.Value 0; if ($v -gt 0) { $info.aperture = 'f/' + [math]::Round($v,1) } }
      0x829A { $v = Read-Rational $pi.Value 0; if ($v -gt 0) { if ($v -ge 1) { $info.shutter = [string][math]::Round($v,1) + 's' } else { $info.shutter = '1/' + [math]::Round(1/$v) + 's' } } }
      0x8827 { if ($pi.Value.Length -ge 4) { $v = [BitConverter]::ToUInt32($pi.Value,0) } else { $v = [BitConverter]::ToUInt16($pi.Value,0) }; if ($v -gt 0) { $info.iso = 'ISO ' + $v } }
      0x920A { $v = Read-Rational $pi.Value 0; if ($v -gt 0) { $info.focal = ('{0}mm' -f [math]::Round($v)) } }
      0x9003 { $d = Read-Ascii $pi; if ($d.Length -ge 10) { $info.date = $d.Substring(0,10).Replace(':','-') } }
      0x0132 { if (-not $info.date) { $d = Read-Ascii $pi; if ($d.Length -ge 10) { $info.date = $d.Substring(0,10).Replace(':','-') } } }
    }
  }
  if (-not $info.date) { $info.date = $file.LastWriteTime.ToString('yyyy-MM-dd') }
  return $info
}

$seriesOut = @()
$totalNew = 0

foreach ($es in $existingSeries) {
  $inConfig = $false
  foreach ($c in $cfg) { if ($c.id -eq $es.id) { $inConfig = $true; break } }
  if (-not $inConfig) { $seriesOut += $es }
}

foreach ($s in $cfg) {
  $src = $s.source
  $id = $s.id
  $theme = if ($s.theme) { $s.theme } else { 'warm' }
  $dest = Join-Path $outDir $id
  New-Item -ItemType Directory -Force -Path $dest | Out-Null

  $existingPhotos = @()
  $seenSrc = @{}
  foreach ($es in $existingSeries) {
    if ($es.id -eq $id) {
      foreach ($p in @($es.photos)) {
        if (-not $p.src) { continue }
        if (-not $p.src.StartsWith(('assets/series/' + $id + '/'))) { continue }
        if ($seenSrc.ContainsKey($p.src)) { continue }
        $f = Join-Path $projectRoot ($p.src -replace '/', '\')
        if (-not (Test-Path -LiteralPath $f)) { continue }
        $seenSrc[$p.src] = $true
        $existingPhotos += $p
      }
    }
  }

  if (-not $state.ContainsKey($id)) {
    if ($existingPhotos.Count -gt 0 -and (Test-Path -LiteralPath $src)) {
      $state[$id] = @((Get-ChildItem -LiteralPath $src -File | Where-Object { $_.Extension -match '^\.(png|jpg|jpeg|tif|tiff|bmp|webp)$' } | ForEach-Object { $_.Name }))
      Write-Output ("{0}: state seeded with {1} already-imported source files" -f $id, $state[$id].Count)
    } else {
      $state[$id] = @()
    }
  }
  $imported = @($state[$id])

  $nextNum = 0
  foreach ($p in $existingPhotos) {
    $m = [regex]::Match($p.src, '(\d+)\.jpg$')
    if ($m.Success) { $nextNum = [math]::Max($nextNum, [int]$m.Groups[1].Value) }
  }

  $newPhotos = @()
  $newNames = @()

  if (Test-Path -LiteralPath $src) {
    $files = Get-ChildItem -LiteralPath $src -File | Where-Object { $_.Extension -match '^\.(png|jpg|jpeg|tif|tiff|bmp|webp)$' -and ($imported -notcontains $_.Name) }
    $sorted = $files | Sort-Object -Property @{Expression={ [regex]::Replace($_.Name,'\d+',{param($m) $m.Value.PadLeft(8,'0')}) }}, Name

    foreach ($f in $sorted) {
      try { $img = [System.Drawing.Image]::FromFile($f.FullName) } catch { Write-Output ("SKIP (unreadable): {0}" -f $f.Name); continue }
      $info = Get-ExifInfo $img $f
      $w = $img.Width; $h = $img.Height
      $scale = [math]::Min(1.0, $maxSide / [double][math]::Max($w,$h))
      $nw = [int][math]::Round($w * $scale); $nh = [int][math]::Round($h * $scale)
      $bmp = New-Object System.Drawing.Bitmap -ArgumentList $nw,$nh
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.DrawImage($img, 0, 0, $nw, $nh)
      $g.Dispose()
      $nextNum++
      $outName = '{0:D3}.jpg' -f $nextNum
      Save-Jpeg $bmp (Join-Path $dest $outName) $quality
      $img.Dispose(); $bmp.Dispose()

      $p = [ordered]@{ src = ('assets/series/' + $id + '/' + $outName); w = $w; h = $h; date = $info.date; caption = '' }
      foreach ($k in @('camera','lens','aperture','shutter','iso','focal')) {
        if ($info.ContainsKey($k)) { $p[$k] = $info[$k] }
      }
      $newPhotos += $p
      $newNames += $f.Name
    }
  } else {
    Write-Output ("SKIP (source missing): {0}" -f $src)
  }

  $state[$id] = @($imported + $newNames)
  $allPhotos = @($existingPhotos + $newPhotos)
  $totalNew += $newPhotos.Count
  Write-Output ("{0}: kept {1}, imported {2} new (total {3})" -f $id, $existingPhotos.Count, $newPhotos.Count, $allPhotos.Count)

  $seriesOut += [ordered]@{ id = $id; title = $s.title; desc = $s.desc; theme = $theme; photos = $allPhotos }
}

$json = ConvertTo-Json @($seriesOut) -Depth 8
[System.IO.File]::WriteAllText($dataPath, ('window.SERIES = ' + $json + ';'), [System.Text.UTF8Encoding]::new($false))

$stateOut = @{}
foreach ($k in $state.Keys) { $stateOut[$k] = @($state[$k]) }
$stateOut | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

Write-Output ("DONE: {0} series, {1} new photos" -f $seriesOut.Count, $totalNew)
