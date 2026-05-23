# Script Final para Publicar - Execute no PowerShell do Windows
# Execute: .\PUBLICAR_FINAL.ps1

Write-Host "🚀 Publicando correções da pontuação da Sprint..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar status do Git
Write-Host "📊 Verificando status do Git..." -ForegroundColor Yellow
$status = git status --short
$commitStatus = git log origin/main..HEAD --oneline

if ($commitStatus) {
    Write-Host "✅ Commit local encontrado: $commitStatus" -ForegroundColor Green
    Write-Host ""
    Write-Host "📤 Tentando fazer push..." -ForegroundColor Yellow
    
    # Tentar push
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅✅✅ SUCESSO! Alterações publicadas!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
        Write-Host "   Acesse: https://app.netlify.com para acompanhar o progresso." -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Erro ao fazer push. Possíveis soluções:" -ForegroundColor Red
        Write-Host ""
        Write-Host "1. Verifique sua conexão com a internet" -ForegroundColor Yellow
        Write-Host "2. Verifique se há proxy configurado:" -ForegroundColor Yellow
        Write-Host "   git config --global --get http.proxy" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Se houver proxy, remova com:" -ForegroundColor Yellow
        Write-Host "   git config --global --unset http.proxy" -ForegroundColor White
        Write-Host "   git config --global --unset https.proxy" -ForegroundColor White
        Write-Host ""
        Write-Host "4. Tente novamente: git push origin main" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "5. Ou use o GitHub Desktop ou VS Code para fazer o push" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Nenhum commit pendente para enviar." -ForegroundColor Yellow
    Write-Host "   Verificando se há alterações não commitadas..." -ForegroundColor Yellow
    
    if ($status) {
        Write-Host "   Há alterações não commitadas. Execute:" -ForegroundColor Yellow
        Write-Host "   git add ." -ForegroundColor White
        Write-Host "   git commit -m 'fix: corrigir cálculo de pontuação'" -ForegroundColor White
        Write-Host "   git push origin main" -ForegroundColor White
    } else {
        Write-Host "   Tudo está sincronizado!" -ForegroundColor Green
    }
}
