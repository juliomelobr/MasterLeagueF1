$body = @{
    email = 'juliomelobr@hotmail.com'
    whatsapp = '5551983433940'
    nomePiloto = 'Julio Melo'
    forceApi = 'twilio'
} | ConvertTo-Json

$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI'
}

try {
    Write-Host "📤 Enviando requisição para Edge Function..." -ForegroundColor Cyan
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri 'https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/send-whatsapp-code' -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
    
    if ($response.success) {
        Write-Host ""
        Write-Host "🎉 Código enviado com sucesso!" -ForegroundColor Cyan
        Write-Host "📱 Verifique seu WhatsApp: 5551983433940" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ ERRO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Detalhes da resposta:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}

