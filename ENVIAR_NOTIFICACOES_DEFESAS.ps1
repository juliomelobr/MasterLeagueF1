# Script para Enviar Notificações de Defesas Pendentes
# Execute: .\ENVIAR_NOTIFICACOES_DEFESAS.ps1 [SERVICE_ROLE_KEY]
# Ou defina: $env:SUPABASE_SERVICE_ROLE_KEY antes de executar

param(
    [string]$ServiceRoleKey = $null
)

Write-Host "📨 Enviando notificações de defesas pendentes..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# URL do Supabase (hardcoded no projeto)
$SUPABASE_URL = "https://ueqfmjwdijaeawvxhdtp.supabase.co"

# Obter SERVICE_ROLE_KEY de parâmetro, variável de ambiente ou solicitar
if ($ServiceRoleKey) {
    $env:SUPABASE_SERVICE_ROLE_KEY = $ServiceRoleKey
} elseif (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ SERVICE_ROLE_KEY não fornecida." -ForegroundColor Red
    Write-Host ""
    Write-Host "Use uma das opções:" -ForegroundColor Yellow
    Write-Host "  1. Passe como parâmetro: .\ENVIAR_NOTIFICACOES_DEFESAS.ps1 'SUA_KEY_AQUI'" -ForegroundColor White
    Write-Host "  2. Defina variável: `$env:SUPABASE_SERVICE_ROLE_KEY='SUA_KEY_AQUI'; .\ENVIAR_NOTIFICACOES_DEFESAS.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Você pode encontrar a SERVICE_ROLE_KEY em:" -ForegroundColor Gray
    Write-Host "  Supabase Dashboard > Settings > API > service_role key" -ForegroundColor Gray
    exit 1
}

# Definir variáveis de ambiente
$env:SUPABASE_URL = $SUPABASE_URL

Write-Host "🔍 Executando em modo DRY-RUN primeiro para verificar..." -ForegroundColor Yellow
Write-Host ""

# Primeiro, executar em modo dry-run para mostrar o que será enviado
node scripts/notificar_defesas_pendentes.js --dry-run

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro ao executar o script. Verifique:" -ForegroundColor Red
    Write-Host "   1. Se o Node.js está instalado" -ForegroundColor Yellow
    Write-Host "   2. Se as dependências estão instaladas (npm install)" -ForegroundColor Yellow
    Write-Host "   3. Se a SERVICE_ROLE_KEY está correta" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📤 Enviando notificações..." -ForegroundColor Green
Write-Host ""

# Executar com --send
node scripts/notificar_defesas_pendentes.js --send

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ Notificações enviadas com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 As mensagens foram enviadas para os pilotos acusados" -ForegroundColor Cyan
    Write-Host "   com status 'Aguardando defesa' que ainda não receberam notificação." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao enviar notificações. Verifique os logs acima." -ForegroundColor Red
}
