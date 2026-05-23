# Script V2 para forçar deploy no Netlify via Git
# Execute este script como Administrador

Write-Host "🚀 Forçando deploy no Netlify via Git (V2)..." -ForegroundColor Cyan
Write-Host ""

# Garantir que estamos no diretório correto
$projectPath = "D:\DEVCODE\PROJETOS\MLF1\master-league-f1"
Set-Location $projectPath

Write-Host "📂 Diretório: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  AVISO: Este script deve ser executado como Administrador para garantir permissões" -ForegroundColor Yellow
    Write-Host ""
}

# Remover todos os locks possíveis
Write-Host "🔓 Removendo locks do Git..." -ForegroundColor Yellow
$locks = @(".git\index.lock", ".git\FETCH_HEAD.lock", ".git\HEAD.lock", ".git\config.lock")
foreach ($lock in $locks) {
    $lockPath = Join-Path $projectPath $lock
    if (Test-Path $lockPath) {
        try {
            Remove-Item $lockPath -Force -ErrorAction Stop
            Write-Host "  ✅ Removido: $lock" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Não foi possível remover: $lock" -ForegroundColor Yellow
        }
    }
}

# Ajustar permissões da pasta .git
Write-Host ""
Write-Host "🔐 Ajustando permissões da pasta .git..." -ForegroundColor Yellow
$gitPath = Join-Path $projectPath ".git"
try {
    $acl = Get-Acl $gitPath
    $permission = "${env:USERNAME}","FullControl","ContainerInherit,ObjectInherit","None","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    Set-Acl $gitPath $acl
    Write-Host "  ✅ Permissões ajustadas" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Erro ao ajustar permissões: $_" -ForegroundColor Yellow
}

# Tentar usar icacls também
try {
    $result = icacls $gitPath /grant "${env:USERNAME}:(OI)(CI)F" /T 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Permissões ajustadas via icacls" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Erro ao usar icacls" -ForegroundColor Yellow
}

# Verificar status do Git
Write-Host ""
Write-Host "📋 Verificando status do Git..." -ForegroundColor Yellow
try {
    $status = git status --porcelain 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Git está funcionando" -ForegroundColor Green
        if ($status) {
            Write-Host "  📝 Alterações encontradas:" -ForegroundColor Cyan
            git status --short
        }
    } else {
        Write-Host "  ❌ Erro ao verificar status do Git" -ForegroundColor Red
        Write-Host "  $status" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Erro: $_" -ForegroundColor Red
}

# Criar commit vazio
Write-Host ""
Write-Host "💾 Criando commit vazio..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "chore: forçar redeploy no Netlify - $timestamp"

try {
    $commitOutput = git commit --allow-empty -m $commitMsg 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Commit criado com sucesso!" -ForegroundColor Green
        Write-Host "  📝 Mensagem: $commitMsg" -ForegroundColor Cyan
    } else {
        Write-Host "  ❌ Erro ao criar commit:" -ForegroundColor Red
        Write-Host "  $commitOutput" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Possíveis soluções:" -ForegroundColor Cyan
        Write-Host "   1. Feche o Cursor/VS Code completamente" -ForegroundColor White
        Write-Host "   2. Feche o GitHub Desktop se estiver aberto" -ForegroundColor White
        Write-Host "   3. Reinicie o computador" -ForegroundColor White
        Write-Host "   4. Use a interface web do Netlify para fazer redeploy" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "  ❌ Erro ao criar commit: $_" -ForegroundColor Red
    exit 1
}

# Fazer push
Write-Host ""
Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Yellow
try {
    $pushOutput = git push origin main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅✅✅ SUCESSO! Push realizado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 O Netlify fará o deploy automático em alguns minutos." -ForegroundColor Cyan
        Write-Host "   Acesse: https://app.netlify.com/sites/masterleaguef1/deploys" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Para acompanhar o deploy:" -ForegroundColor Yellow
        Write-Host "   1. Acesse o link acima" -ForegroundColor White
        Write-Host "   2. Aguarde 2-5 minutos para o build completar" -ForegroundColor White
        Write-Host "   3. Verifique os logs se houver algum erro" -ForegroundColor White
    } else {
        Write-Host "  ❌ Erro ao fazer push:" -ForegroundColor Red
        Write-Host "  $pushOutput" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Verifique sua conexão com a internet e tente novamente" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "  ❌ Erro ao fazer push: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Processo concluído!" -ForegroundColor Green
