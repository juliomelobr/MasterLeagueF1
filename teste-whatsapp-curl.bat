@echo off
echo 📤 Enviando requisição para Edge Function...
echo.
echo ⚠️ IMPORTANTE: Altere o número na linha abaixo se necessário
echo    Formato: 5511987654321 (55 + DDD + número com 9 dígitos)
echo.

curl -X POST ^
  "https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/send-whatsapp-code" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI" ^
  -d "{\"email\":\"juliomelobr@hotmail.com\",\"whatsapp\":\"5551983433940\",\"nomePiloto\":\"Julio Melo\"}"

echo.
echo.
pause
