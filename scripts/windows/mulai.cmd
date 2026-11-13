@echo off
rem Menjalankan MutuRS di Windows; dipanggil tugas Task Scheduler "MutuRS" saat Windows mulai (scripts\windows\pasang.ps1).
rem Bila server berhenti (mis. database belum siap setelah listrik padam), dijalankan lagi 10 detik kemudian.
cd /d "%~dp0app"
:ulang
"C:\Program Files\nodejs\node.exe" --env-file="%~dp0.env" server.js >> "%~dp0log\app.log" 2>&1
ping -n 11 127.0.0.1 > nul
goto ulang
