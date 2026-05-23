# Script para Fazer Backup do Projeto
# Execute: .\fazer-backup.ps1

$projectName = "master-league-f1"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "📦 Iniciando backup do projeto..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Tentar criar em D:\DEV-BACKUPS primeiro
$backupBaseDir = "D:\DEV-BACKUPS"
$backupCreated = $false

if (Test-Path "D:\") {
    try {
        if (-not (Test-Path $backupBaseDir)) {
            New-Item -ItemType Directory -Path $backupBaseDir -Force -ErrorAction Stop | Out-Null
        }
        # Testar escrita
        $testFile = Join-Path $backupBaseDir "test-write.tmp"
        "test" | Out-File -FilePath $testFile -ErrorAction Stop
        Remove-Item $testFile -ErrorAction SilentlyContinue
        $backupCreated = $true
        Write-Host "✅ Usando D:\DEV-BACKUPS" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Não foi possível usar D:\DEV-BACKUPS" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  D:\ não existe" -ForegroundColor Yellow
}

# Se não conseguiu, usar pasta dentro do projeto
if (-not $backupCreated) {
    $backupBaseDir = Join-Path (Get-Location) "backups"
    Write-Host "📁 Usando pasta 'backups' dentro do projeto" -ForegroundColor Yellow
    try {
        if (-not (Test-Path $backupBaseDir)) {
            New-Item -ItemType Directory -Path $backupBaseDir -Force -ErrorAction Stop | Out-Null
        }
        $backupCreated = $true
        Write-Host "✅ Pasta 'backups' criada/verificada" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro ao criar pasta de backup: $_" -ForegroundColor Red
        exit 1
    }
}

# Criar diretório do backup atual
$backupDir = Join-Path $backupBaseDir "$projectName-BACKUP-$timestamp"
Write-Host "📁 Criando diretório do backup: $backupDir" -ForegroundColor Yellow

try {
    New-Item -ItemType Directory -Path $backupDir -Force -ErrorAction Stop | Out-Null
    Write-Host "✅ Diretório do backup criado!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao criar diretório do backup: $_" -ForegroundColor Red
    exit 1
}

# Obter diretório atual do projeto
$projectRoot = Get-Location

Write-Host ""
Write-Host "📋 Copiando arquivos..." -ForegroundColor Yellow
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Gray
Write-Host ""

# Lista de arquivos/pastas para excluir do backup
$excludeDirs = @(
    "node_modules",
    "dist",
    "dist-ssr",
    ".git",
    ".netlify",
    ".vscode",
    ".idea",
    ".cursor",
    "backups"
)

$excludeFiles = @(
    "*.log",
    "*.cache"
)

# Usar robocopy para copiar (mais eficiente que Copy-Item)
$robocopyArgs = @(
    $projectRoot.Path,
    $backupDir,
    "/E",           # Copiar subdiretórios incluindo vazios
    "/NFL",         # Não listar arquivos
    "/NDL",         # Não listar diretórios
    "/NJH",         # Não mostrar cabeçalho
    "/NJS"          # Não mostrar resumo
)

# Adicionar exclusões de diretórios
foreach ($dir in $excludeDirs) {
    $robocopyArgs += "/XD"
    $robocopyArgs += $dir
}

# Adicionar exclusões de arquivos
foreach ($file in $excludeFiles) {
    $robocopyArgs += "/XF"
    $robocopyArgs += $file
}

# Executar robocopy
$robocopyResult = & robocopy @robocopyArgs 2>&1

# Verificar se a cópia foi bem-sucedida (códigos 0-1 são sucesso)
if ($LASTEXITCODE -le 1) {
    Write-Host "✅ Arquivos copiados com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Aviso: Alguns arquivos podem não ter sido copiados (código: $LASTEXITCODE)" -ForegroundColor Yellow
}

# Criar arquivo de informações do backup
$infoFile = Join-Path $backupDir "BACKUP_INFO.txt"
$backupSize = (Get-ChildItem -Path $backupDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

$infoContent = @"
BACKUP DO PROJETO: $projectName
Data/Hora: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Diretório Original: $projectRoot
Diretório de Backup: $backupDir

Arquivos/Pastas Excluídos:
- node_modules
- dist
- dist-ssr
- .git
- .netlify
- .vscode
- .idea
- .cursor
- backups
- *.log
- *.cache

Tamanho do Backup: $backupSizeMB MB
"@

$infoContent | Out-File -FilePath $infoFile -Encoding UTF8

Write-Host ""
Write-Host "✅ Backup concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Localização do backup:" -ForegroundColor Cyan
Write-Host "   $backupDir" -ForegroundColor White
Write-Host ""
Write-Host "📊 Tamanho do backup:" -ForegroundColor Cyan
Write-Host "   $backupSizeMB MB" -ForegroundColor White
Write-Host ""
