# Script para Executar Notificações de Defesas Pendentes
# Execute: .\EXECUTAR_NOTIFICACOES.ps1

Write-Host "📨 Executando notificações de defesas pendentes..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# URL do Supabase
$env:SUPABASE_URL = "https://ueqfmjwdijaeawvxhdtp.supabase.co"

# Verificar se SERVICE_ROLE_KEY está definida
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ SERVICE_ROLE_KEY não encontrada!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para executar, defina a variável de ambiente:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY = "SUA_CHAVE_AQUI"' -ForegroundColor White
    Write-Host "  .\EXECUTAR_NOTIFICACOES.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou execute diretamente:" -ForegroundColor Yellow
    Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY = "SUA_CHAVE_AQUI"; node scripts/notificar_defesas_pendentes.js --dry-run' -ForegroundColor White
    Write-Host ""
    Write-Host "Você pode encontrar a SERVICE_ROLE_KEY em:" -ForegroundColor Gray
    Write-Host "  Supabase Dashboard > Settings > API > service_role key" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Executando em modo DRY-RUN primeiro..." -ForegroundColor Yellow
Write-Host ""

# Executar dry-run
node scripts/notificar_defesas_pendentes.js --dry-run

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro ao executar. Verifique a SERVICE_ROLE_KEY." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📤 Enviando notificações..." -ForegroundColor Green
Write-Host ""

# Executar envio real
node scripts/notificar_defesas_pendentes.js --send

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ Notificações processadas com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erro ao enviar notificações. Verifique os logs acima." -ForegroundColor Red
}
