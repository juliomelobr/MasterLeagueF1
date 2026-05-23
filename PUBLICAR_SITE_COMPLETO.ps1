# Script para publicar o site completo
# Execute este script em um PowerShell externo (não no terminal integrado)

Write-Host "🚀 Publicando site completo..." -ForegroundColor Cyan

# Navegar para o diretório do projeto
cd D:\DEVCODE\PROJETOS\MLF1\master-league-f1

# Remover lock se existir
if (Test-Path .git/index.lock) {
    Write-Host "🔓 Removendo lock file..." -ForegroundColor Yellow
    Remove-Item .git/index.lock -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Adicionar todos os arquivos modificados e novos (exceto node_modules e backups)
Write-Host "`n📦 Adicionando arquivos do projeto..." -ForegroundColor Yellow
git add -A

# Remover arquivos de backup do staging (se foram adicionados)
Write-Host "`n🧹 Removendo arquivos de backup do staging..." -ForegroundColor Yellow
git reset HEAD -- "master-league-f1-BACKUP-*/" 2>$null

# Verificar o que será commitado
Write-Host "`n📊 Arquivos que serão commitados:" -ForegroundColor Yellow
git status --short | Select-Object -First 30

# Fazer commit
Write-Host "`n💾 Criando commit..." -ForegroundColor Yellow
$commitMessage = "chore: atualizar site completo - Power Ranking cards, dependências e melhorias"
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Nenhuma alteração para commitar ou erro no commit." -ForegroundColor Yellow
    Write-Host "Verificando se há commits pendentes..." -ForegroundColor Yellow
    git log origin/main..HEAD --oneline
} else {
    Write-Host "`n✅ Commit criado com sucesso!" -ForegroundColor Green
}

# Fazer push
Write-Host "`n⬆️  Enviando para o GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅✅✅ SUCESSO! Site completo publicado!" -ForegroundColor Green
    Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
    Write-Host "📊 Acesse: https://app.netlify.com para acompanhar o progresso." -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Erro ao fazer push." -ForegroundColor Red
    Write-Host "💡 Verifique a conexão com o GitHub e tente novamente." -ForegroundColor Yellow
}
