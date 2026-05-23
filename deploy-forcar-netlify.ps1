# Script para forçar deploy no Netlify via Git
# Execute este script como Administrador se houver problemas de permissão

Write-Host "🚀 Forçando deploy no Netlify via Git..." -ForegroundColor Cyan
Write-Host ""

# Garantir que estamos no diretório correto
$projectPath = "D:\DEVCODE\PROJETOS\MLF1\master-league-f1"
Set-Location $projectPath

Write-Host "📂 Diretório: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Tentar remover lock files
Write-Host "🔓 Verificando e removendo locks..." -ForegroundColor Yellow
$lockFile = Join-Path $projectPath ".git\index.lock"
if (Test-Path $lockFile) {
    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "✅ Lock file removido" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Não foi possível remover o lock file" -ForegroundColor Yellow
        Write-Host "   Feche todos os programas que usam Git (VS Code, Cursor, GitHub Desktop, etc.)" -ForegroundColor Yellow
        Write-Host "   E execute este script novamente" -ForegroundColor Yellow
        exit 1
    }
}

# Verificar status do Git
Write-Host ""
Write-Host "📋 Verificando status do Git..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Há alterações não commitadas:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $response = Read-Host "Deseja fazer commit dessas alterações? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        git add -A
        $commitMsg = Read-Host "Digite a mensagem do commit (ou pressione Enter para usar padrão)"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "chore: atualizar projeto"
        }
        git commit -m $commitMsg
    }
}

# Criar commit vazio para forçar deploy
Write-Host ""
Write-Host "💾 Criando commit vazio para forçar deploy..." -ForegroundColor Yellow
try {
    git commit --allow-empty -m "chore: forçar redeploy no Netlify - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "✅ Commit criado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao criar commit: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Soluções possíveis:" -ForegroundColor Cyan
    Write-Host "   1. Feche todos os programas que usam Git" -ForegroundColor White
    Write-Host "   2. Execute este script como Administrador" -ForegroundColor White
    Write-Host "   3. Reinicie o computador e tente novamente" -ForegroundColor White
    exit 1
}

# Fazer push
Write-Host ""
Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Yellow
try {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅✅✅ SUCESSO! Push realizado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
        Write-Host "   Acesse: https://app.netlify.com para acompanhar o progresso." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Para verificar o deploy:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://app.netlify.com/sites/masterleaguef1/deploys" -ForegroundColor White
        Write-Host "   2. Aguarde alguns minutos para o build completar" -ForegroundColor White
    } else {
        Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao fazer push: $_" -ForegroundColor Red
    exit 1
}
