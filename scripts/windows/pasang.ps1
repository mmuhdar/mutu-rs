# Pemasangan dan pembaruan MutuRS di Windows Server tanpa Docker (lihat INSTALASI.md, bagian Windows).
# Jalankan dari folder kode MutuRS sebagai Administrator:
#   powershell -ExecutionPolicy Bypass -File scripts\windows\pasang.ps1 -NamaRs "RSUD Contoh" -FolderBackup E:\mutu-rs-backup
# Aman diulang: Node.js, PostgreSQL, database, dan .env yang sudah ada tidak ditimpa; aplikasi dibangun ulang dari kode ini.
# Hasil: PostgreSQL 17 sebagai Windows Service "mutu-rs-postgresql" (hanya localhost), aplikasi lewat Task Scheduler
# "MutuRS" (saat Windows mulai, tanpa login), backup harian "MutuRS Backup" pukul 01.00 WITA, aturan firewall "MutuRS".
param(
  [string]$NamaRs = 'Rumah Sakit',
  [string]$Folder = 'C:\mutu-rs',
  [string]$FolderBackup = '',
  [int]$Port = 3000,
  [string]$ZonaWaktu = 'Asia/Makassar',
  # Jam backup harian (01.00) dalam offset UTC zona waktu RS: +07:00 WIB, +08:00 WITA, +09:00 WIT.
  [string]$OffsetBackup = '+08:00',
  [string]$NodeVersi = '',
  [string]$PgZip = 'https://get.enterprisedb.com/postgresql/postgresql-17.12-1-windows-x64-binaries.zip'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Sumber = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Node = 'C:\Program Files\nodejs\node.exe'
$Pg = Join-Path $Folder 'pgsql\bin'
$Data = Join-Path $Folder 'pgdata'
$FileEnv = Join-Path $Folder '.env'
if (-not $FolderBackup) { $FolderBackup = Join-Path $Folder 'backup' }
New-Item -ItemType Directory -Force (Join-Path $Folder 'log'), (Join-Path $Folder 'unduhan') | Out-Null
Start-Transcript -Append -Path (Join-Path $Folder 'log\pasang.log') | Out-Null

function Langkah($teks) { Write-Host "`n== $teks" }

# Unduhan diulang beberapa kali: jaringan RS bisa putus-sambung.
function Unduh($url, $tujuan) {
  for ($i = 1; $i -le 5; $i++) {
    try { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile "$tujuan.part" -TimeoutSec 900; Move-Item -Force "$tujuan.part" $tujuan; return }
    catch { Write-Host "  unduhan gagal (percobaan $i): $($_.Exception.Message)"; Start-Sleep -Seconds (5 * $i) }
  }
  throw "Gagal mengunduh $url"
}

function Jalankan($exe, [string[]]$argumen) {
  & $exe @argumen
  if ($LASTEXITCODE -ne 0) { throw "$exe keluar dengan kode $LASTEXITCODE" }
}

# Sandi acak huruf + angka (aman di dalam URL koneksi).
function SandiAcak([int]$panjang = 24) {
  $huruf = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'.ToCharArray()
  $bita = New-Object byte[] $panjang
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bita)
  -join ($bita | ForEach-Object { $huruf[$_ % $huruf.Length] })
}

function BacaEnv {
  $nilai = @{}
  foreach ($baris in Get-Content $FileEnv) {
    if ($baris -match '^\s*([A-Z_]+)=(.*)$') { $nilai[$Matches[1]] = $Matches[2].Trim('"') }
  }
  $nilai
}

# .env berisi sandi: hanya Administrators, SYSTEM, dan NetworkService (akun aplikasi) yang boleh membacanya.
function KunciEnv {
  Jalankan icacls.exe @($FileEnv, '/inheritance:r', '/grant', '*S-1-5-32-544:F', '/grant', '*S-1-5-18:F', '/grant', '*S-1-5-20:R') | Out-Null
}

Langkah 'Node.js 24'
if (-not (Test-Path $Node) -or -not ((& $Node --version) -like 'v24.*')) {
  if (-not $NodeVersi) {
    $NodeVersi = ((Invoke-RestMethod -TimeoutSec 60 https://nodejs.org/dist/index.json) | Where-Object { $_.version -like 'v24.*' -and $_.lts } | Select-Object -First 1).version
  }
  $msi = Join-Path $Folder "unduhan\node-$NodeVersi-x64.msi"
  if (-not (Test-Path $msi)) { Unduh "https://nodejs.org/dist/$NodeVersi/node-$NodeVersi-x64.msi" $msi }
  $p = Start-Process msiexec.exe -ArgumentList @('/i', "`"$msi`"", '/qn', '/norestart') -Wait -PassThru
  if ($p.ExitCode -notin 0, 3010) { throw "Pemasangan Node.js gagal (kode $($p.ExitCode))" }
}
$env:Path = "C:\Program Files\nodejs;$env:Path"
Write-Host "  Node.js $(& $Node --version)"

Langkah 'PostgreSQL 17'
if (-not (Test-Path (Join-Path $Pg 'pg_ctl.exe'))) {
  $zip = Join-Path $Folder 'unduhan\postgresql-windows-x64.zip'
  if (-not (Test-Path $zip)) { Unduh $PgZip $zip }
  # Isi zip = folder pgsql\; tar bawaan Windows jauh lebih cepat daripada Expand-Archive untuk berkas sebesar ini.
  Jalankan tar.exe @('-xf', $zip, '-C', $Folder)
}
Write-Host "  $(& (Join-Path $Pg 'postgres.exe') --version)"

Langkah 'Konfigurasi (.env)'
if (-not (Test-Path $FileEnv)) {
  $sandiDb = SandiAcak
  $isi = @(
    '# Konfigurasi MutuRS di Windows, dibuat scripts\windows\pasang.ps1. Penjelasan variabel: .env.example di kode MutuRS.'
    "NAMA_RS=`"$NamaRs`""
    "APP_TIMEZONE=$ZonaWaktu"
    'ADMIN_USERNAME=admin'
    "ADMIN_PASSWORD=$(SandiAcak 16)"
    "DATABASE_URL=postgres://mutu:$sandiDb@127.0.0.1:5432/mutu"
    "BACKUP_DIR=$FolderBackup"
    'NODE_ENV=production'
    'NEXT_TELEMETRY_DISABLED=1'
    "PORT=$Port"
    'HOSTNAME=0.0.0.0'
  )
  Set-Content -Path $FileEnv -Value $isi -Encoding ASCII
  KunciEnv
  Write-Host "  .env baru dibuat: $FileEnv"
} else { Write-Host "  .env sudah ada, tidak diubah." }
$cfg = BacaEnv
# Setelah pemasangan pertama, .env yang menentukan port (ganti PORT di .env lalu jalankan ulang skrip ini).
if ($cfg.PORT) { $Port = [int]$cfg.PORT }
$sandiDb = ([uri]$cfg.DATABASE_URL).UserInfo.Split(':')[1]

Langkah 'Database'
if (-not (Test-Path (Join-Path $Data 'PG_VERSION'))) {
  $pwfile = Join-Path $Folder 'unduhan\pw.txt'
  Set-Content -Path $pwfile -Value $sandiDb -NoNewline -Encoding ASCII
  try {
    # Pengguna "mutu" = superuser, sama seperti POSTGRES_USER di docker compose. Urutan teks mengikuti ICU en-US.
    Jalankan (Join-Path $Pg 'initdb.exe') @('-D', $Data, '-U', 'mutu', "--pwfile=$pwfile", '-E', 'UTF8', '--locale-provider=icu', '--icu-locale=en-US', '--locale=C', '--auth=scram-sha-256')
  } finally { Remove-Item -Force $pwfile }
  Add-Content -Path (Join-Path $Data 'postgresql.conf') -Value "`n# MutuRS: hanya dari server ini.`nlisten_addresses = '127.0.0.1'`nport = 5432" -Encoding ASCII
  # Layanan berjalan sebagai NetworkService (S-1-5-20), yang perlu menulis folder data.
  Jalankan icacls.exe @($Data, '/grant', '*S-1-5-20:(OI)(CI)M') | Out-Null
}
if (-not (Get-Service mutu-rs-postgresql -ErrorAction SilentlyContinue)) {
  Jalankan (Join-Path $Pg 'pg_ctl.exe') @('register', '-N', 'mutu-rs-postgresql', '-D', $Data, '-S', 'auto', '-w')
}
Start-Service mutu-rs-postgresql
$env:PGPASSWORD = $sandiDb
$psql = Join-Path $Pg 'psql.exe'
for ($i = 1; $i -le 30; $i++) { & (Join-Path $Pg 'pg_isready.exe') -h 127.0.0.1 -p 5432 -q; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep 2 }
if ((& $psql -h 127.0.0.1 -U mutu -d postgres -tAc "select 1 from pg_database where datname = 'mutu'") -ne '1') {
  Jalankan $psql @('-h', '127.0.0.1', '-U', 'mutu', '-d', 'postgres', '-c', 'create database mutu')
}
Remove-Item Env:\PGPASSWORD
Write-Host '  Layanan mutu-rs-postgresql berjalan.'

Langkah 'Build aplikasi'
Push-Location $Sumber
try {
  $env:NEXT_TELEMETRY_DISABLED = '1'
  Jalankan 'C:\Program Files\nodejs\npm.cmd' @('ci', '--no-audit', '--no-fund')
  Jalankan 'C:\Program Files\nodejs\npm.cmd' @('run', 'build')
} finally { Pop-Location }

Langkah 'Menghentikan versi lama'
Stop-ScheduledTask -TaskName 'MutuRS' -ErrorAction SilentlyContinue
$appDir = Join-Path $Folder 'app'
Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*server.js*' -and $_.ExecutablePath -eq $Node -and $_.CommandLine -like "*$Folder*") -or
  ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like "*$Folder\mulai.cmd*")
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2

Langkah 'Menyalin aplikasi'
# Sama dengan image Docker: hasil standalone + .next\static + migrasi drizzle.
& robocopy.exe (Join-Path $Sumber '.next\standalone') $appDir /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy standalone gagal ($LASTEXITCODE)" }
& robocopy.exe (Join-Path $Sumber '.next\static') (Join-Path $appDir '.next\static') /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy static gagal ($LASTEXITCODE)" }
& robocopy.exe (Join-Path $Sumber 'drizzle') (Join-Path $appDir 'drizzle') /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy drizzle gagal ($LASTEXITCODE)" }
Copy-Item -Force (Join-Path $PSScriptRoot 'mulai.cmd'), (Join-Path $PSScriptRoot 'backup.ps1') $Folder
# Aplikasi berjalan sebagai NetworkService (bukan SYSTEM): boleh menulis log dan cache Next saja.
New-Item -ItemType Directory -Force (Join-Path $appDir '.next\cache') | Out-Null
foreach ($tulis in (Join-Path $Folder 'log'), (Join-Path $appDir '.next\cache')) {
  Jalankan icacls.exe @($tulis, '/grant', '*S-1-5-20:(OI)(CI)M') | Out-Null
}

Langkah 'Task Scheduler dan firewall'
$sistem = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$atur = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
$akunAplikasi = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\NETWORKSERVICE' -LogonType ServiceAccount
Register-ScheduledTask -Force -TaskName 'MutuRS' -Description 'Aplikasi MutuRS (scripts\windows\pasang.ps1)' -Principal $akunAplikasi -Settings $atur `
  -Trigger (New-ScheduledTaskTrigger -AtStartup) `
  -Action (New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$Folder\mulai.cmd`"") | Out-Null
# Jam backup dengan offset eksplisit: tetap 01.00 waktu RS walau zona waktu Windows berbeda.
$pemicu = New-ScheduledTaskTrigger -Daily -At '01:00'
$pemicu.StartBoundary = (Get-Date -Format 'yyyy-MM-dd') + "T01:00:00$OffsetBackup"
Register-ScheduledTask -Force -TaskName 'MutuRS Backup' -Description 'Backup harian database MutuRS' -Principal $sistem `
  -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable) -Trigger $pemicu `
  -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Folder\backup.ps1`"") | Out-Null
if (Get-NetFirewallRule -DisplayName 'MutuRS' -ErrorAction SilentlyContinue) {
  Set-NetFirewallRule -DisplayName 'MutuRS' -Protocol TCP -LocalPort $Port
} else {
  New-NetFirewallRule -DisplayName 'MutuRS' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
}
New-Item -ItemType Directory -Force $FolderBackup | Out-Null

Langkah 'Menjalankan'
Start-ScheduledTask -TaskName 'MutuRS'
$siap = $false
for ($i = 1; $i -le 60; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:$Port/masuk").StatusCode -eq 200) { $siap = $true; break } } catch { }
  Start-Sleep 3
}
if (-not $siap) { throw "Aplikasi belum menjawab di port $Port. Periksa $Folder\log\app.log" }
Write-Host "  MutuRS berjalan: http://$($env:COMPUTERNAME):$Port (dan lewat IP server)."
Write-Host "  Admin Sistem awal: username $($cfg.ADMIN_USERNAME), sandi di $FileEnv (ADMIN_PASSWORD). Ganti sandi setelah masuk pertama."
Stop-Transcript | Out-Null
