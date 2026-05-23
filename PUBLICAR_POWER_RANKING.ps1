# Script para publicar o arquivo powerRankingObjectives.js
# Execute este script em um PowerShell externo (não no terminal integrado)

Write-Host "🚀 Publicando alterações..." -ForegroundColor Cyan

# Navegar para o diretório do projeto
cd D:\DEVCODE\PROJETOS\MLF1\master-league-f1

# Verificar status
Write-Host "`n📊 Status do Git:" -ForegroundColor Yellow
git status --short

# Verificar se há commits para enviar
Write-Host "`n📝 Último commit local:" -ForegroundColor Yellow
git log --oneline -1

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
