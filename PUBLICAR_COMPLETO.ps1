# Script para Publicar Site Completo no Netlify
# Execute: .\PUBLICAR_COMPLETO.ps1

Write-Host "🚀 Publicando site completo no Netlify..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Tentar remover lock file se existir
Write-Host "🔓 Verificando e removendo lock files do Git..." -ForegroundColor Yellow
if (Test-Path ".git\index.lock") {
    try {
        Remove-Item ".git\index.lock" -Force -ErrorAction Stop
        Write-Host "✅ Lock file removido" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Não foi possível remover o lock file. Feche todos os programas que usam Git (VS Code, GitHub Desktop, etc.) e tente novamente." -ForegroundColor Yellow
        exit 1
    }
}

# Adicionar todas as alterações
Write-Host ""
Write-Host "📦 Adicionando todas as alterações..." -ForegroundColor Yellow
git add -A

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar arquivos. Verifique se há processos Git em execução." -ForegroundColor Red
    exit 1
}

# Verificar se há alterações para commitar
$status = git status --short
if (-not $status) {
    Write-Host "✅ Não há alterações pendentes. Tudo está sincronizado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Verificando se há commits locais para enviar..." -ForegroundColor Yellow
    
    $commitStatus = git log origin/main..HEAD --oneline
    if ($commitStatus) {
        Write-Host "📤 Enviando commits pendentes..." -ForegroundColor Yellow
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅✅✅ SUCESSO! Alterações publicadas!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
            Write-Host "   Acesse: https://app.netlify.com para acompanhar o progresso." -ForegroundColor Cyan
        } else {
            Write-Host "❌ Erro ao fazer push." -ForegroundColor Red
        }
    } else {
        Write-Host "✅ Tudo está sincronizado com o GitHub!" -ForegroundColor Green
    }
    exit 0
}

# Fazer commit
Write-Host ""
Write-Host "💾 Criando commit..." -ForegroundColor Yellow
git commit -m "chore: limpar diretório de backup e atualizar configurações do Netlify"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao criar commit." -ForegroundColor Red
    exit 1
}

# Fazer push
Write-Host ""
Write-Host "⬆️  Enviando para o GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ SUCESSO! Site completo publicado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
    Write-Host "   Acesse: https://app.netlify.com para acompanhar o progresso." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 O deploy inclui:" -ForegroundColor Yellow
    Write-Host "   - Remoção do diretório de backup" -ForegroundColor White
    Write-Host "   - Atualizações do .gitignore" -ForegroundColor White
    Write-Host "   - Configurações do Netlify" -ForegroundColor White
    Write-Host "   - Todas as correções anteriores" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push. Possíveis soluções:" -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Verifique sua conexão com a internet" -ForegroundColor Yellow
    Write-Host "2. Verifique se há processos Git em execução" -ForegroundColor Yellow
    Write-Host "3. Tente novamente: git push origin main" -ForegroundColor Yellow
}
