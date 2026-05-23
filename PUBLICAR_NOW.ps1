# Script para publicar correções - Execute no PowerShell do Windows
# Execute: .\PUBLICAR_NOW.ps1

Write-Host "🚀 Publicando correções..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Remover lock do Git
Write-Host "🔓 Removendo lock do Git..." -ForegroundColor Yellow
if (Test-Path .git/index.lock) {
    try {
        Remove-Item .git/index.lock -Force
        Write-Host "✅ Lock removido" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Não foi possível remover o lock. Tente fechar todos os programas e executar como Administrador." -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 1

# Verificar configuração do Git
Write-Host "⚙️  Verificando configuração do Git..." -ForegroundColor Yellow
$gitName = git config user.name
$gitEmail = git config user.email

if (-not $gitName -or -not $gitEmail) {
    Write-Host "⚠️  Configuração do Git não encontrada. Configurando..." -ForegroundColor Yellow
    $name = Read-Host "Digite seu nome (ou pressione Enter para 'Julio')"
    if (-not $name) { $name = "Julio" }
    
    $email = Read-Host "Digite seu email (ou pressione Enter para 'julio@masterleaguef1.com')"
    if (-not $email) { $email = "julio@masterleaguef1.com" }
    
    git config user.name $name
    git config user.email $email
    Write-Host "✅ Git configurado" -ForegroundColor Green
}

# Adicionar arquivos
Write-Host ""
Write-Host "📝 Adicionando arquivos corrigidos..." -ForegroundColor Yellow
git add src/pages/Standings.jsx src/pages/Home.jsx src/pages/Telemetria.jsx src/pages/AdminPowerRanking.jsx

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar arquivos" -ForegroundColor Red
    Write-Host "   Tente executar como Administrador ou feche todos os programas que possam estar usando o Git" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivos adicionados" -ForegroundColor Green

# Fazer commit
Write-Host ""
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git commit -m "fix: corrigir cálculo de pontuação para incluir pontos da Sprint na classificação total"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Commit realizado" -ForegroundColor Green

# Fazer push
Write-Host ""
Write-Host "📤 Enviando para o repositório..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Alterações enviadas com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
    Write-Host "   Acesse o painel do Netlify para acompanhar o progresso." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
    Write-Host "   Possíveis causas:" -ForegroundColor Yellow
    Write-Host "   - Problema de conexão com a internet" -ForegroundColor Yellow
    Write-Host "   - Problema de autenticação (execute: git push novamente)" -ForegroundColor Yellow
    Write-Host "   - Proxy ou firewall bloqueando" -ForegroundColor Yellow
    exit 1
}
