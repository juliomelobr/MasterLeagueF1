# Script para publicar correções da pontuação da Sprint
# Execute como Administrador: .\PUBLICAR_AGORA.ps1

Write-Host "🚀 Publicando correções no Netlify..." -ForegroundColor Cyan
Write-Host ""

# Remover lock do Git
if (Test-Path .git/index.lock) {
    Write-Host "🔓 Removendo lock do Git..." -ForegroundColor Yellow
    Remove-Item .git/index.lock -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Adicionar arquivos corrigidos
Write-Host "📝 Adicionando arquivos corrigidos..." -ForegroundColor Yellow
git add src/pages/Standings.jsx src/pages/Home.jsx src/pages/Telemetria.jsx src/pages/AdminPowerRanking.jsx

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar arquivos. Tente executar como Administrador." -ForegroundColor Red
    exit 1
}

# Fazer commit
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git commit -m "fix: corrigir cálculo de pontuação para incluir pontos da Sprint na classificação total"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit." -ForegroundColor Red
    exit 1
}

# Fazer push
Write-Host "📤 Enviando para o repositório..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Alterações enviadas com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
    Write-Host "   Acesse o painel do Netlify para acompanhar o progresso." -ForegroundColor Cyan
} else {
    Write-Host "❌ Erro ao fazer push. Verifique sua conexão e credenciais Git." -ForegroundColor Red
    exit 1
}
