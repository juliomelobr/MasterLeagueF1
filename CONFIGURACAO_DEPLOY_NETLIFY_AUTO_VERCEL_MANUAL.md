# ⚙️ Configuração: Netlify Automático + Vercel Manual

## 📋 Configuração Atual

- ✅ **Netlify**: Deploy automático quando você fizer `git push`
- ✅ **Vercel**: Deploy manual apenas quando você pedir

---

## 🚀 PARTE 1: Verificar/Configurar Netlify (Automático)

### Verificar se está configurado:

1. **Acesse**: https://app.netlify.com/sites/masterleaguef1/settings/deploys
2. **Verifique**:
   - ✅ **Connected Git repository**: Deve mostrar `jmelogp-svg/master-league-f1`
   - ✅ **Deploy on push**: Deve estar **ATIVADO**
   - ✅ **Production branch**: Deve ser `main`

### Se não estiver configurado:

1. Clique em **"Link repository"**
2. Conecte ao GitHub
3. Selecione: `jmelogp-svg/master-league-f1`
4. Configure:
   - **Branch to deploy**: `main`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist`
5. Ative **"Deploy on push"**

✅ **Pronto!** Agora o Netlify faz deploy automaticamente.

---

## 🎯 PARTE 2: Configurar Vercel (Manual)

### Desativar Deploy Automático no Vercel:

1. **Acesse**: https://vercel.com/jmelogp-8099s-projects/master-league-f1/settings/git
2. **Desative**:
   - ❌ **Automatic deployments from Git**: DESATIVAR
   - Ou mantenha ativo mas ignore os deploys automáticos

**Alternativa (Recomendada)**: Manter ativo mas usar apenas deploys manuais quando você quiser.

### Como Fazer Deploy Manual no Vercel:

#### Opção 1: Via CLI (Recomendado)

```bash
# Deploy manual em produção
npx vercel --prod

# Ou apenas preview
npx vercel
```

#### Opção 2: Via Dashboard

1. Acesse: https://vercel.com/jmelogp-8099s-projects/master-league-f1
2. Clique em **"Deployments"**
3. Clique nos **3 pontinhos** (⋯) do último deploy
4. Clique em **"Redeploy"**
5. Escolha **"Use existing Build Cache"** ou **"Rebuild"**

---

## 📝 Scripts Úteis

### Criar Script para Deploy Manual no Vercel

Crie um arquivo `deploy-vercel.ps1` (PowerShell) ou `deploy-vercel.sh` (Bash):

**Windows (PowerShell):**
```powershell
# deploy-vercel.ps1
Write-Host "🚀 Fazendo deploy no Vercel..." -ForegroundColor Cyan
npx vercel --prod --yes
Write-Host "✅ Deploy concluído!" -ForegroundColor Green
```

**Uso:**
```powershell
.\deploy-vercel.ps1
```

**Linux/Mac (Bash):**
```bash
#!/bin/bash
# deploy-vercel.sh
echo "🚀 Fazendo deploy no Vercel..."
npx vercel --prod --yes
echo "✅ Deploy concluído!"
```

**Uso:**
```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

---

## 🔄 Fluxo de Trabalho

### Quando você fizer alterações:

```bash
# 1. Fazer suas alterações no código
# 2. Commit e push
git add .
git commit -m "Descrição das alterações"
git push origin main

# 3. Netlify faz deploy AUTOMATICAMENTE (2-5 minutos)
# ✅ Site atualizado em: https://masterleaguef1.com.br

# 4. Se quiser atualizar o Vercel também:
npx vercel --prod
# ✅ Site atualizado em: https://master-league-f1.vercel.app
```

---

## 📊 Resumo da Configuração

| Plataforma | Tipo de Deploy | Quando Atualiza | URL |
|------------|----------------|-----------------|-----|
| **Netlify** | ✅ Automático | A cada `git push` | https://masterleaguef1.com.br |
| **Vercel** | 🎯 Manual | Quando você executar `npx vercel --prod` | https://master-league-f1.vercel.app |

---

## 🧪 Testar Configuração

### Teste 1: Deploy Automático no Netlify

```bash
# Fazer uma alteração pequena
echo "<!-- Test Netlify Auto $(Get-Date) -->" >> index.html

# Commit e push
git add index.html
git commit -m "Test: deploy automático Netlify"
git push origin main

# Aguardar 2-5 minutos
# Verificar: https://app.netlify.com/sites/masterleaguef1/deploys
# ✅ Deve aparecer um novo deploy automaticamente
```

### Teste 2: Deploy Manual no Vercel

```bash
# Fazer deploy manual
npx vercel --prod

# Verificar: https://vercel.com/jmelogp-8099s-projects/master-league-f1
# ✅ Deve aparecer um novo deploy
```

---

## 💡 Dicas

### Netlify (Automático)
- ✅ Sempre atualiza quando você faz push
- ✅ Não precisa fazer nada manual
- ✅ Ideal para produção principal

### Vercel (Manual)
- 🎯 Atualiza apenas quando você quiser
- 🎯 Útil para testes antes de publicar
- 🎯 Backup quando necessário

---

## 🚨 Troubleshooting

### Netlify não está fazendo deploy automático?

1. Verifique se está conectado ao GitHub
2. Verifique se "Deploy on push" está ativado
3. Verifique se está fazendo push para a branch `main`
4. Veja os logs: https://app.netlify.com/sites/masterleaguef1/deploys

### Vercel fazendo deploy automático quando não quero?

1. Desative em: https://vercel.com/[seu-projeto]/settings/git
2. Ou simplesmente ignore os deploys automáticos
3. Use apenas `npx vercel --prod` quando quiser

---

**Data**: Dezembro 2025  
**Versão**: 1.0



























