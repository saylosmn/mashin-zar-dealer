@echo off
chcp 65001 >nul
REM Auto car: шинэ APK build хийгээд GitHub Release-д тавина (вэб сайтын "Апп татах" автоматаар шинэчлэгдэнэ).
REM Энэ файл repo\ хавтсанд, гарын үсгийн түлхүүр (auto-car.jks, credentials.json) нэг дээд хавтсанд байна.
REM Зөвхөн app.json, лого, native сан өөрчлөгдсөн үед хэрэгтэй. Кодын бусад өөрчлөлт Expo Update-ээр өөрөө явна.
cd /d "%~dp0"
git pull --ff-only || goto :err
cd mobile
copy /y "..\..\auto-car.jks" auto-car.jks >nul || goto :err
copy /y "..\..\credentials.json" credentials.json >nul || goto :err
echo [1/3] Сангууд суулгаж байна...
call npm ci --no-audit --no-fund > "..\..\release-log.txt" 2>&1 || goto :err
echo [2/3] APK build хийж байна (Expo сервер дээр 10-15 мин)...
call npx -y eas-cli@latest build -p android --profile preview --non-interactive --wait --json > "..\..\build.json" 2>> "..\..\release-log.txt" || goto :err
for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "(Get-Content '..\..\build.json' -Raw | ConvertFrom-Json)[0].artifacts.buildUrl"`) do set APK=%%U
cd ..
echo %APK%> release\apk-url.txt
echo [3/3] GitHub Release үүсгэж байна...
git add release\apk-url.txt
git commit -m "APK: %APK%" || goto :err
git push || goto :err
echo ===== АМЖИЛТТАЙ: 2-3 минутын дараа вэб сайтын "Апп татах" шинэ APK-тай болно =====
echo ===== АМЖИЛТТАЙ ===== >> "..\release-log.txt"
timeout /t 30
exit /b 0
:err
echo ===== Алдаа гарлаа =====
echo ===== Алдаа гарлаа ===== >> "..\release-log.txt"
timeout /t 120
exit /b 1
