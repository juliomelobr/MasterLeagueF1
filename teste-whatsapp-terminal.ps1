# Teste de Envio de Código WhatsApp via Terminal
# Execute este script no PowerShell

$SUPABASE_URL = "https://ueqfmjwdijaeawvxhdtp.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/send-whatsapp-code"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI"

# ⚠️ NÚMERO DESTINATÁRIO
# Formato: 5551983433940 (55 + 51 + 983433940)
$NUMERO_DESTINATARIO = "5551983433940"

$body = @{
    email = "juliomelobr@hotmail.com"
    whatsapp = $NUMERO_DESTINATARIO
    nomePiloto = "Julio Melo"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "📤 Enviando requisição..." -ForegroundColor Cyan
Write-Host "URL: $FUNCTION_URL" -ForegroundColor Gray
Write-Host "Destinatário: $NUMERO_DESTINATARIO" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
    if ($response.success) {
        Write-Host ""
        Write-Host "🎉 Código enviado! Verifique seu WhatsApp ($NUMERO_DESTINATARIO)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erro!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    # Tentar ler a resposta de erro
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
