@echo off
chcp 65001 >nul
REM Auto car аппын кодыг Expo Update-ээр шинэчилнэ (APK дахин суулгах шаардлагагүй)
cd /d "%~dp0mobile"
if not exist node_modules call npm ci --no-audit --no-fund
call npx -y eas-cli@latest update --channel preview --platform android --non-interactive --message "Шинэчлэл"
echo ===== Дууслаа =====
timeout /t 60
