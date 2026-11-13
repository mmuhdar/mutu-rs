# Backup database MutuRS di Windows, setara scripts/backup.sh: dump SQL polos ke BACKUP_DIR (dari .env), disimpan 30 hari.
# Otomatis tiap hari pukul 01.00 waktu RS lewat tugas Task Scheduler "MutuRS Backup", atau segera dengan:
#   Start-ScheduledTask -TaskName 'MutuRS Backup'
# Pemulihan: INSTALASI.md, bagian Windows.
$ErrorActionPreference = 'Stop'
$Folder = $PSScriptRoot
$cfg = @{}
foreach ($baris in Get-Content (Join-Path $Folder '.env')) {
  if ($baris -match '^\s*([A-Z_]+)=(.*)$') { $cfg[$Matches[1]] = $Matches[2].Trim('"') }
}
$tujuan = if ($cfg.BACKUP_DIR) { $cfg.BACKUP_DIR } else { Join-Path $Folder 'backup' }
New-Item -ItemType Directory -Force $tujuan | Out-Null
$log = Join-Path $Folder 'log\backup.log'

$berkas = Join-Path $tujuan ('mutu-{0}.sql' -f (Get-Date -Format 'yyyy-MM-dd_HHmm'))
try {
  # Ditulis ke berkas sementara dulu supaya dump yang gagal/terpotong tidak terlihat seperti backup utuh.
  & (Join-Path $Folder 'pgsql\bin\pg_dump.exe') --clean --if-exists -f "$berkas.tmp" -d $cfg.DATABASE_URL
  if ($LASTEXITCODE -ne 0) { throw "pg_dump keluar dengan kode $LASTEXITCODE" }
  Move-Item -Force "$berkas.tmp" $berkas
  Add-Content $log "$(Get-Date -Format s) Backup selesai: $berkas"
} catch {
  Remove-Item -Force "$berkas.tmp" -ErrorAction SilentlyContinue
  Add-Content $log "$(Get-Date -Format s) Backup GAGAL: $($_.Exception.Message)"
  throw
}

# Simpan 30 hari. Kelonggaran 1 jam supaya dump 30 hari lalu tidak ikut terhapus hanya karena selisih detik.
Get-ChildItem $tujuan -Filter 'mutu-*.sql' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30).AddHours(-1) } | Remove-Item -Force
