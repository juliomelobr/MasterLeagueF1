# Script para publicar package.json e package-lock.json atualizados
# Execute este script em um PowerShell externo (não no terminal integrado)

Write-Host "🚀 Publicando atualizações do package.json..." -ForegroundColor Cyan

# Navegar para o diretório do projeto
cd D:\DEVCODE\PROJETOS\MLF1\master-league-f1

# Remover lock se existir
if (Test-Path .git/index.lock) {
    Write-Host "🔓 Removendo lock file..." -ForegroundColor Yellow
    Remove-Item .git/index.lock -Force -ErrorAction SilentlyContinue
}

# Adicionar os arquivos atualizados
Write-Host "`n📦 Adicionando package.json e package-lock.json..." -ForegroundColor Yellow
git add package.json package-lock.json

# Verificar o que será commitado
Write-Host "`n📊 Status:" -ForegroundColor Yellow
git status --short package.json package-lock.json

# Fazer commit
Write-Host "`n💾 Criando commit..." -ForegroundColor Yellow
git commit -m "fix: atualizar package.json e package-lock.json para incluir html2canvas"

# Fazer push
Write-Host "`n⬆️  Enviando para o GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅✅✅ SUCESSO! Alterações publicadas!" -ForegroundColor Green
    Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
    Write-Host "📊 Acesse: https://app.netlify.com para acompanhar o progresso." -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Erro ao fazer push. Tente novamente em um terminal externo." -ForegroundColor Red
    Write-Host "💡 Dica: Execute este script em um PowerShell como Administrador." -ForegroundColor Yellow
}
