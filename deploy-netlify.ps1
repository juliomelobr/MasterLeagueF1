# Script PowerShell para Deploy no Netlify
# Execute: .\deploy-netlify.ps1

Write-Host "🚀 Preparando deploy no Netlify..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar se netlify-cli está instalado
Write-Host "📦 Verificando Netlify CLI..." -ForegroundColor Yellow
$netlifyInstalled = Get-Command netlify -ErrorAction SilentlyContinue

if (-not $netlifyInstalled) {
    Write-Host "⚠️  Netlify CLI não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g netlify-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Netlify CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Netlify CLI instalado!" -ForegroundColor Green
} else {
    Write-Host "✅ Netlify CLI já está instalado" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔨 Fazendo build do projeto..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build. Corrija os erros antes de continuar." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído!" -ForegroundColor Green
Write-Host ""

# Verificar se está logado no Netlify
Write-Host "🔐 Verificando login no Netlify..." -ForegroundColor Yellow
$netlifyStatus = netlify status 2>&1

if ($LASTEXITCODE -ne 0 -or $netlifyStatus -match "Not logged in") {
    Write-Host "⚠️  Você precisa fazer login no Netlify primeiro." -ForegroundColor Yellow
    Write-Host "   Execute: netlify login" -ForegroundColor Cyan
    Write-Host ""
    $login = Read-Host "Deseja fazer login agora? (S/N)"
    if ($login -eq "S" -or $login -eq "s") {
        netlify login
    } else {
        Write-Host "❌ Login necessário para continuar" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🚀 Iniciando deploy..." -ForegroundColor Cyan
Write-Host ""

# Deploy
netlify deploy --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Acesse o painel do Netlify para ver seu site"
    Write-Host "   2. Configure um nome personalizado se desejar"
    Write-Host "   3. Configure domínio personalizado (opcional)"
} else {
    Write-Host ""
    Write-Host "❌ Erro no deploy. Verifique os logs acima." -ForegroundColor Red
    exit 1
}
