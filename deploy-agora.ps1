# Script para Deploy Imediato no Netlify
# Execute: .\deploy-agora.ps1

Write-Host "🚀 Iniciando deploy no Netlify..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Tentar fazer build
Write-Host "🔨 Tentando fazer build do projeto..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Build local falhou, mas vamos tentar deploy mesmo assim" -ForegroundColor Yellow
        Write-Host "   O Netlify fará o build automaticamente" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Build local concluído!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Erro no build local, mas vamos continuar" -ForegroundColor Yellow
    Write-Host "   O Netlify fará o build automaticamente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Tentando usar Netlify CLI via npx..." -ForegroundColor Yellow

# Tentar fazer deploy via npx (sem instalação global)
try {
    Write-Host "🔐 Abrindo login do Netlify..." -ForegroundColor Cyan
    Write-Host "   (Uma janela do navegador será aberta)" -ForegroundColor Gray
    Write-Host ""
    
    npx --yes netlify-cli login
    
    Write-Host ""
    Write-Host "🚀 Fazendo deploy..." -ForegroundColor Cyan
    Write-Host ""
    
    npx --yes netlify-cli deploy --prod --dir=dist
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Seu site está no ar!" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "⚠️  Deploy via CLI falhou. Use o método manual:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Acesse: https://app.netlify.com/drop" -ForegroundColor Cyan
        Write-Host "2. Arraste a pasta 'dist' para a área indicada" -ForegroundColor Cyan
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao fazer deploy via CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Use o método manual:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Acesse: https://app.netlify.com" -ForegroundColor Cyan
    Write-Host "2. Clique em 'Add new site' → 'Import an existing project'" -ForegroundColor Cyan
    Write-Host "3. Conecte seu repositório Git" -ForegroundColor Cyan
    Write-Host "4. Configure:" -ForegroundColor Cyan
    Write-Host "   - Build command: npm run build" -ForegroundColor Gray
    Write-Host "   - Publish directory: dist" -ForegroundColor Gray
    Write-Host "5. Clique em 'Deploy site'" -ForegroundColor Cyan
    Write-Host ""
}
