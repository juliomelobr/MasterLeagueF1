# ⚡ Guia Rápido: Deploy Automático Duplo + Fallback

## ✅ Resposta Rápida

### 1. Deploy Automático em Ambos: **SIM, É POSSÍVEL!**

### 2. Fallback Automático de Domínio: **PARCIALMENTE POSSÍVEL**

- ✅ **Gratuito**: Monitoramento + fallback manual (5-15 min)
- ✅ **Pago**: Cloudflare Load Balancing (failover automático < 1 min)

---

## 🚀 PARTE 1: Configurar Deploy Automático (5 minutos)

### Netlify (Já está parcialmente configurado)

1. **Acesse**: https://app.netlify.com/sites/masterleaguef1/settings/deploys
2. **Verifique** se está conectado ao GitHub:
   - Se SIM: ✅ Já está configurado!
   - Se NÃO: Clique em "Link repository" e conecte ao `jmelogp-svg/master-league-f1`
3. **Ative** "Deploy on push" (se não estiver ativo)

### Vercel (Precisa configurar)

1. **Acesse**: https://vercel.com/new
2. **Conecte ao GitHub** (se ainda não conectou)
3. **Selecione o repositório**: `jmelogp-svg/master-league-f1`
4. **Configure**:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Clique em "Deploy"**

✅ **Pronto!** Agora ambos fazem deploy automaticamente quando você fizer `git push`.

---

## 🔄 PARTE 2: Fallback de Domínio (Netlify → Vercel)

### ⚠️ IMPORTANTE: Limitação do DNS

**O DNS não "sabe" se o Netlify está online ou não.** Ele apenas aponta para um endereço.

### Solução 1: Monitoramento + Fallback Manual (Gratuito)

#### Passo 1: Configurar UptimeRobot (Gratuito)

1. **Crie conta**: https://uptimerobot.com (gratuito, 50 monitors)
2. **Adicione Monitor**:
   - Tipo: HTTP(s)
   - URL: `https://masterleaguef1.com.br`
   - Intervalo: 5 minutos
   - Alertas: Seu email

#### Passo 2: Quando Receber Alerta (Netlify Offline)

1. **Acesse seu registrador de DNS** (onde está o domínio)
2. **Altere o registro CNAME**:
   - **De**: `masterleaguef1.netlify.app` (Netlify)
   - **Para**: `master-league-f1.vercel.app` (Vercel)
3. **Aguarde 5-15 minutos** (propagação DNS)

**Tempo de resposta**: 5-15 minutos

### Solução 2: Cloudflare Load Balancing (Pago, Automático)

#### Passo 1: Mover DNS para Cloudflare

1. **Crie conta**: https://cloudflare.com
2. **Adicione domínio**: `masterleaguef1.com.br`
3. **Configure nameservers** no seu registrador

#### Passo 2: Configurar Load Balancing

1. No Cloudflare: **Traffic** → **Load Balancing**
2. **Criar Pool**:
   - Origin 1: `masterleaguef1.netlify.app` (Primary)
   - Origin 2: `master-league-f1.vercel.app` (Failover)
3. **Health Checks**: Automático
4. **Failover**: Automático quando Primary falhar

**Tempo de resposta**: < 1 minuto (automático)

**Custo**: ~$5/mês (Cloudflare Load Balancing)

---

## 📋 Checklist Rápido

### Deploy Automático
- [ ] Netlify conectado ao GitHub ✅ (já está)
- [ ] Vercel conectado ao GitHub (fazer agora)
- [ ] Testar: fazer `git push` e verificar ambos

### Fallback (Escolha uma opção)
- [ ] **Opção 1 (Gratuito)**: UptimeRobot configurado
- [ ] **Opção 2 (Pago)**: Cloudflare Load Balancing configurado

---

## 🧪 Testar Deploy Automático

```bash
# Fazer uma alteração pequena
echo "<!-- Test $(Get-Date) -->" >> index.html

# Commit e push
git add index.html
git commit -m "Test: deploy automático duplo"
git push origin main

# Aguardar 2-5 minutos e verificar:
# - Netlify: https://app.netlify.com/sites/masterleaguef1/deploys
# - Vercel: https://vercel.com/[seu-projeto]/deploys
```

---

## 💡 Recomendação

### Para Começar (Gratuito):
1. ✅ Configure deploy automático em ambos
2. ✅ Configure UptimeRobot para monitoramento
3. ✅ Documente processo de fallback manual

### Para Produção Crítica (Pago):
1. ✅ Configure Cloudflare Load Balancing
2. ✅ Failover automático < 1 minuto

---

**Tempo de Configuração**: 10-15 minutos  
**Custo**: $0 (gratuito) ou $5/mês (Cloudflare)



























