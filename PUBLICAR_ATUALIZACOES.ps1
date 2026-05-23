# Script para publicar atualizações no Netlify
# Execute: .\PUBLICAR_ATUALIZACOES.ps1

Write-Host "🚀 Publicando atualizações no Netlify..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Tentar remover lock file se existir
if (Test-Path ".git\index.lock") {
    Write-Host "🔓 Removendo lock file..." -ForegroundColor Yellow
    Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue
}

# Verificar status do git
Write-Host "📋 Verificando status do Git..." -ForegroundColor Yellow
$status = git status --porcelain
if (-not $status) {
    Write-Host "✅ Nenhuma alteração para commitar" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "📝 Alterações encontradas:" -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "➕ Adicionando todas as alterações..." -ForegroundColor Yellow
git add -A

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar arquivos" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git commit -m "feat: ajustes no sistema de notificações, biografia e bandeiras de hotlaps

- Removidas notificações para jurados (apenas ADM recebe)
- Removido uso do Z-API (apenas Twilio)
- Removidas restrições de horário comercial
- Adicionada notificação para acusador quando análise é aberta
- Ajustadas mensagens para retirada de bug
- Adicionada notificação para ADM quando veredito final é dado
- Corrigido cálculo de pontos na biografia (inclui Sprint)
- Melhorada descrição de pontos na biografia (especifica grids e temporadas)
- Adicionado fallback para bandeiras dos EUA em hotlaps (Texas, Miami, Las Vegas)"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ Alterações publicadas com sucesso!" -ForegroundColor Green
    Write-Host "🌐 O Netlify irá fazer deploy automaticamente" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
    exit 1
}
