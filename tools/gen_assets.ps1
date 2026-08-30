$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $projectRoot 'assets'
$photoDir = Join-Path $assetDir 'photos'
New-Item -ItemType Directory -Force -Path $photoDir | Out-Null

$script:bayer = @(@(0,2),@(3,1))

function C { param([int]$r,[int]$g,[int]$b) [System.Drawing.Color]::FromArgb($r,$g,$b) }

function Mix { param($a,$b,[double]$t)
  if($t -lt 0){$t=0}; if($t -gt 1){$t=1}
  C ([int][math]::Round($a[0]+($b[0]-$a[0])*$t)) ([int][math]::Round($a[1]+($b[1]-$a[1])*$t)) ([int][math]::Round($a[2]+($b[2]-$a[2])*$t))
}

function Jit { param([int]$x,[int]$y,[double]$s) ((($script:bayer[$y%2][$x%2]+0.5)/4)-0.5)*$s }

function Sky { param($bmp,$top,$bot,[int]$y0,[int]$y1,[double]$s)
  for($y=$y0;$y -lt $y1;$y++){
    for($x=0;$x -lt $bmp.Width;$x++){
      $t=($y-$y0)/[double][math]::Max(1,($y1-$y0))
      $bmp.SetPixel($x,$y,(Mix $top $bot ($t+(Jit $x $y $s))))
    }
  }
}

function Rect { param($bmp,[int]$x0,[int]$y0,[int]$w,[int]$h,$c)
  for($y=$y0;$y -lt ($y0+$h);$y++){
    if($y -lt 0 -or $y -ge $bmp.Height){continue}
    for($x=$x0;$x -lt ($x0+$w);$x++){
      if($x -lt 0 -or $x -ge $bmp.Width){continue}
      $bmp.SetPixel($x,$y,$c)
    }
  }
}

function Ridge { param($bmp,$f,$c)
  for($x=0;$x -lt $bmp.Width;$x++){
    $y=[int][math]::Round((& $f $x))
    if($y -lt 0){$y=0}
    for($yy=$y;$yy -lt $bmp.Height;$yy++){ $bmp.SetPixel($x,$yy,$c) }
  }
}

function Circle { param($bmp,[double]$cx,[double]$cy,[double]$r,$c,[double]$edge)
  for($y=[int]($cy-$r-$edge-1); $y -le [int]($cy+$r+$edge+1); $y++){
    if($y -lt 0 -or $y -ge $bmp.Height){continue}
    for($x=[int]($cx-$r-$edge-1); $x -le [int]($cx+$r+$edge+1); $x++){
      if($x -lt 0 -or $x -ge $bmp.Width){continue}
      $d=[math]::Sqrt(($x-$cx)*($x-$cx)+($y-$cy)*($y-$cy))
      if($d -le $r){ $bmp.SetPixel($x,$y,$c) }
      elseif($d -le ($r+$edge)){
        $t=1-(($d-$r)/[math]::Max(0.001,$edge))
        if((Jit $x $y 1) -lt ($t-0.5)){ $bmp.SetPixel($x,$y,$c) }
      }
    }
  }
}

function Dots { param($bmp,$rand,[int]$n,[int]$maxY,$c)
  for($i=0;$i -lt $n;$i++){
    $x=$rand.Next(0,$bmp.Width); $y=$rand.Next(0,$maxY)
    $bmp.SetPixel($x,$y,$c)
    if(($rand.NextDouble() -gt 0.85) -and ($x+1) -lt $bmp.Width){ $bmp.SetPixel($x+1,$y,$c) }
  }
}

function Tri { param($bmp,[int]$cx,[int]$ty,[int]$h,$c)
  for($i=0;$i -lt $h;$i++){
    $half=[int][math]::Floor($i*0.7)
    Rect $bmp ($cx-$half) ($ty+$i) (2*$half+1) 1 $c
  }
}

function SavePng { param($bmp,$path) $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose() }

function NewCanvas { param([int]$w,[int]$h) New-Object System.Drawing.Bitmap -ArgumentList $w,$h }

$ink    = @(43,58,74)
$inkDeep= @(22,32,46)
$cream  = @(245,240,230)
$orange = @(232,168,124)

$r = New-Object System.Random -ArgumentList 11

$p = NewCanvas 96 64
Sky $p @(249,197,141) @(224,116,90) 0 46 1.0
Circle $p 64 32 7 (C 255 243 214) 2.4
Ridge $p {param($x) 36+6*[math]::Sin($x*0.13)+3*[math]::Sin($x*0.047+2)} (C 148 110 116)
Ridge $p {param($x) 46+5*[math]::Sin($x*0.085+1)+2.5*[math]::Sin($x*0.19+0.5)} (C 66 78 98)
Rect $p 0 56 96 8 (C $ink[0] $ink[1] $ink[2])
$p.SetPixel(20,14,(C 60 70 86)); $p.SetPixel(22,14,(C 60 70 86)); $p.SetPixel(21,15,(C 60 70 86))
$p.SetPixel(34,10,(C 60 70 86)); $p.SetPixel(36,10,(C 60 70 86)); $p.SetPixel(35,11,(C 60 70 86))
SavePng $p (Join-Path $photoDir 'p1.png')

$p = NewCanvas 96 64
Sky $p @(247,224,186) @(233,161,112) 0 30 0.8
Circle $p 18 12 5 (C 255 246 222) 1.6
for($y=30;$y -lt 64;$y++){
  for($x=0;$x -lt 96;$x++){
    $t=($y-30)/34.0
    $base=Mix @(64,110,142) @(43,58,74) ($t+(Jit $x $y 0.3))
    if(((($x*5+$y*3)%29) -eq 0) -and (($y%2) -eq 0)){ $base=Mix @(64,110,142) @(245,240,230) 0.35 }
    $p.SetPixel($x,$y,$base)
  }
}
Rect $p 56 34 14 2 (C 30 38 50)
Rect $p 62 22 1 12 (C 30 38 50)
for($i=0;$i -lt 10;$i++){ Rect $p 63 (22+$i) (9-$i) 1 (C 245 240 230) }
SavePng $p (Join-Path $photoDir 'p2.png')

$p = NewCanvas 96 64
Sky $p @(28,40,56) @(49,67,92) 0 64 0.6
Dots $p $r 90 40 (C 245 240 230)
Circle $p 22 16 8 (C 245 240 230) 2.2
$buildings = @(@(2,40,10),@(14,32,8),@(24,44,12),@(38,28,10),@(50,38,12),@(64,34,8),@(74,42,10),@(86,36,8))
foreach($bd in $buildings){
  Rect $p $bd[0] $bd[1] $bd[2] (54-$bd[1]) (C 20 30 44)
  for($i=0;$i -lt 5;$i++){
    $wx=$bd[0]+1+$r.Next(0,[math]::Max(1,$bd[2]-2))
    $wy=$bd[1]+2+$r.Next(0,[math]::Max(1,52-$bd[1]-2))
    if($r.NextDouble() -gt 0.45){ $p.SetPixel($wx,$wy,(C 232 168 124)) }
  }
}
Rect $p 42 22 1 6 (C 20 30 44)
$p.SetPixel(42,21,(C 232 168 124))
Rect $p 0 54 96 10 (C 16 24 34)
SavePng $p (Join-Path $photoDir 'p3.png')

$p = NewCanvas 96 64
Sky $p @(224,233,202) @(178,206,152) 0 24 0.7
for($y=24;$y -lt 64;$y++){
  for($x=0;$x -lt 96;$x++){
    $t=($y-24)/40.0
    $p.SetPixel($x,$y,(Mix @(150,180,120) @(74,106,74) ($t+(Jit $x $y 0.5))))
  }
}
Tri $p 12 8 16 (C 58 74 63);  Rect $p 11 24 2 4 (C 58 74 63)
Tri $p 26 4 20 (C 58 74 63);  Rect $p 25 24 2 4 (C 58 74 63)
Tri $p 40 10 14 (C 58 74 63); Rect $p 39 24 2 4 (C 58 74 63)
Tri $p 58 6 18 (C 58 74 63);  Rect $p 57 24 2 4 (C 58 74 63)
Tri $p 72 3 21 (C 58 74 63);  Rect $p 71 24 2 4 (C 58 74 63)
Tri $p 86 9 15 (C 58 74 63);  Rect $p 85 24 2 4 (C 58 74 63)
Rect $p 5 20 5 44 (C 46 60 52)
Rect $p 85 16 6 48 (C 46 60 52)
Dots $p $r 22 64 (C 245 240 230)
SavePng $p (Join-Path $photoDir 'p4.png')

$p = NewCanvas 96 64
Sky $p @(199,213,231) @(236,241,247) 0 42 0.8
for($y=42;$y -lt 64;$y++){
  for($x=0;$x -lt 96;$x++){
    $t=($y-42)/22.0
    $p.SetPixel($x,$y,(Mix @(240,244,250) @(214,224,238) ($t+(Jit $x $y 0.4))))
  }
}
Rect $p 47 34 2 10 (C 43 58 74)
Tri $p 48 18 16 (C 43 58 74)
Rect $p 41 44 14 2 (C 205 214 228)
Dots $p $r 60 42 (C 255 255 255)
SavePng $p (Join-Path $photoDir 'p5.png')

$p = NewCanvas 96 64
Sky $p @(72,62,104) @(196,120,92) 0 50 0.7
Dots $p $r 70 34 (C 245 240 230)
Circle $p 68 14 6 (C 245 240 230) 1.2
Circle $p 71 12 5 (Mix @(72,62,104) @(196,120,92) 0.35) 0
Ridge $p {param($x) 44+4*[math]::Sin($x*0.09+3)} (C 96 74 110)
Ridge $p {param($x) 52+3.5*[math]::Sin($x*0.06+1)} (C 46 42 66)
$p.SetPixel(30,55,(C 232 168 124)); $p.SetPixel(30,54,(C 240 200 140)); $p.SetPixel(29,55,(C 240 200 140))
SavePng $p (Join-Path $photoDir 'p6.png')

$p = NewCanvas 96 64
Sky $p @(92,102,124) @(56,66,88) 0 64 0.45
$bcity = @(@(0,30,14),@(16,22,10),@(28,36,16),@(46,26,12),@(60,34,10),@(72,24,14),@(88,32,8))
foreach($bd in $bcity){
  Rect $p $bd[0] $bd[1] $bd[2] (58-$bd[1]) (C 34 44 58)
  for($i=0;$i -lt 4;$i++){
    $wx=$bd[0]+1+$r.Next(0,[math]::Max(1,$bd[2]-2))
    $wy=$bd[1]+2+$r.Next(0,[math]::Max(1,56-$bd[1]-2))
    if($r.NextDouble() -gt 0.55){ $p.SetPixel($wx,$wy,(C 245 240 230)) }
  }
}
for($i=0;$i -lt 160;$i++){
  $x=$r.Next(0,96); $y=$r.Next(0,58)
  $p.SetPixel($x,$y,(C 190 200 218))
  if($y+1 -lt 58){ $p.SetPixel($x,$y+1,(C 190 200 218)) }
}
Rect $p 0 58 96 6 (C 30 38 50)
SavePng $p (Join-Path $photoDir 'p7.png')

$p = NewCanvas 96 64
Sky $p @(249,232,184) @(240,187,142) 0 30 0.7
Circle $p 46 14 6 (C 255 246 222) 1.8
for($y=30;$y -lt 64;$y++){
  for($x=0;$x -lt 96;$x++){
    $t=($y-30)/34.0
    $p.SetPixel($x,$y,(Mix @(198,204,130) @(118,142,90) ($t+(Jit $x $y 0.55))))
  }
}
$p.SetPixel(24,12,(C 43 58 74)); $p.SetPixel(26,12,(C 43 58 74)); $p.SetPixel(25,13,(C 43 58 74))
$p.SetPixel(60,16,(C 43 58 74)); $p.SetPixel(62,16,(C 43 58 74)); $p.SetPixel(61,17,(C 43 58 74))
for($i=0;$i -lt 30;$i++){
  $x=$r.Next(0,94); $y=40+$r.Next(0,22)
  $p.SetPixel($x,$y,(C 96 118 76)); $p.SetPixel($x,($y+1),(C 96 118 76))
}
SavePng $p (Join-Path $photoDir 'p8.png')

$legend = [System.Collections.Hashtable]::new([System.StringComparer]::Ordinal)
$legend['.'] = $null
$legend['S'] = C 245 220 196
$legend['E'] = C 43 58 74
$legend['B'] = C 232 168 124
$legend['b'] = C 226 150 100
$legend['O'] = C 43 58 74
$legend['o'] = C 245 240 230
$legend['X'] = C 43 58 74
$legend['s'] = C 232 168 124
$legend['L'] = C 34 44 58
$legend['D'] = C 22 32 46
$legend['G'] = C 96 104 116
$legend['l'] = C 22 32 46

function Sprite { param($map,$leg,$path)
  $h=$map.Count; $w=$map[0].Length
  $bmp = NewCanvas $w $h
  for($y=0;$y -lt $h;$y++){
    for($x=0;$x -lt $w;$x++){
      $ch=[string]$map[$y][$x]
      if($leg.ContainsKey($ch) -and ($null -ne $leg[$ch])){ $bmp.SetPixel($x,$y,$leg[$ch]) }
    }
  }
  SavePng $bmp $path
}

$walkerIdle = @(
"....BBBB....",
"..BBBBBBBB..",
"...SSSSSS...",
"...SESSSE...",
"...SSSSSS...",
"....SSSS....",
"..sOOOOOOs..",
".OOOOOOOOOO.",
".OOOOOOOOOO.",
".OOOOOOOOOO.",
".OOOOOOOOOO.",
"..OOOOOOOO..",
"..OO....OO..",
"..LL....LL..",
"..LL....LL..",
"..LL....LL..",
"..DD....DD.."
)

$walkerWalk = @(
"....BBBB....",
"..BBBBBBBB..",
"...SSSSSS...",
"...SESSSE...",
"...SSSSSS...",
"....SSSS....",
"..sOOOOOOs..",
".OOOOOOOOOO.",
".OOOOOOOOOO.",
".OOOOOOOOOO.",
".OOOOOOOOOO.",
"..OOOOOOOO..",
"....OOOO....",
"....LLLL....",
"...LL..LL...",
"...LL..LL...",
"...DD..DD..."
)

$avatar = @(
"................",
"....bbbbbbbb....",
"...bbbbbbbbbb...",
"..BBBBBBBBBBBB..",
".BBBBBBBBBBBBBB.",
".bBBBBBBBBBBBBb.",
"...SSSSSSSSSS...",
"...SEESSSSEES...",
"...SSSSSSSSSS...",
"....SSSSSSSS....",
"...GGGGGGGGGG...",
"..GGGGlllGGGGG..",
"..GGGGlllGGGGG..",
"..SSGGGGGGGGSS..",
"...OOOOOOOOOO...",
"..OOOOOOOOOOOO.."
)

$cursor = @(
"X...............",
"XX..............",
"XoX.............",
"XooX............",
"XoooX...........",
"XooooX..........",
"XoooooX.........",
"XooooooX........",
"XoooooooX.......",
"XooooooooX......",
"XooooXXXXXX.....",
"XooXooX.........",
"XoX.XooX........",
"XX..XooX........",
"X....XooX.......",
".....XXX........"
)

Sprite $walkerIdle $legend (Join-Path $assetDir 'sprite-idle.png')
Sprite $walkerWalk $legend (Join-Path $assetDir 'sprite-walk.png')
Sprite $avatar    $legend (Join-Path $assetDir 'avatar.png')
Sprite $cursor    $legend (Join-Path $assetDir 'cursor.png')

Write-Output 'OK'
