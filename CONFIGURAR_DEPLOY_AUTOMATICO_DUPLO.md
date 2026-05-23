# 🚀 Configurar Deploy Automático Duplo (Netlify + Vercel)

## 📋 Objetivo

Configurar deploy automático simultâneo em **Netlify** e **Vercel** sempre que houver push no GitHub, e configurar fallback de domínio caso o Netlify falhe.

---

## ✅ PARTE 1: Deploy Automático em Ambos

### 1.1 Netlify - Deploy Automático (Já Configurado Parcialmente)

O Netlify já está linkado ao seu repositório. Vamos verificar e garantir que está configurado corretamente:

#### Passo 1: Verificar Conexão no Netlify

1. Acesse: https://app.netlify.com
2. Vá em **Sites** → **masterleaguef1**
3. Vá em **Site settings** → **Build & deploy**
4. Verifique se está conectado ao GitHub:
   - **Build settings** → **Connected Git repository**
   - Deve mostrar: `jmelogp-svg/master-league-f1`

#### Passo 2: Configurar Build Settings (se necessário)

No Netlify, configure:
- **Build command**: `npm install && npm run build`
- **Publish directory**: `dist`
- **Branch to deploy**: `main`

✅ **Já está configurado no `netlify.toml`!**

#### Passo 3: Ativar Deploy Automático

1. No Netlify, vá em **Build & deploy** → **Continuous Deployment**
2. Certifique-se que está **ativado**
3. Configure:
   - ✅ **Deploy on push**: Ativado
   - ✅ **Branch to deploy**: `main`
   - ✅ **Build hooks**: Opcional (para deploys manuais)

### 1.2 Vercel - Deploy Automático

#### Passo 1: Conectar Repositório ao Vercel

1. Acesse: https://vercel.com
2. Vá em **Add New Project**
3. Conecte ao GitHub (se ainda não conectou)
4. Selecione o repositório: `jmelogp-svg/master-league-f1`
5. Configure o projeto:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (raiz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Passo 2: Configurar Deploy Automático

1. No projeto Vercel, vá em **Settings** → **Git**
2. Configure:
   - ✅ **Production Branch**: `main`
   - ✅ **Automatic deployments from Git**: Ativado
   - ✅ **Deploy on push**: Ativado

#### Passo 3: Verificar Configuração

O arquivo `vercel.json` já foi criado com as configurações necessárias.

### 1.3 Testar Deploy Automático

```bash
# Fazer uma alteração pequena
echo "<!-- Test deploy -->" >> index.html

# Commit e push
git add .
git commit -m "Test: deploy automático duplo"
git push origin main
```

**Resultado esperado:**
- ✅ Netlify detecta o push e faz deploy automaticamente
- ✅ Vercel detecta o push e faz deploy automaticamente
- ✅ Ambos ficam disponíveis em ~2-5 minutos

---

## 🔄 PARTE 2: Fallback de Domínio (Netlify → Vercel)

### 2.1 Entendendo o Problema

**Limitação**: Não é possível fazer fallback automático direto no DNS quando um serviço falha. O DNS não "sabe" se o Netlify está funcionando ou não.

### 2.2 Soluções Possíveis

#### Opção 1: Monitoramento com DNS Dinâmico (Recomendado)

Use um serviço de monitoramento que verifica o Netlify e redireciona para Vercel se falhar.

**Serviços Recomendados:**
1. **UptimeRobot** (Gratuito)
2. **StatusCake** (Gratuito limitado)
3. **Pingdom** (Pago)
4. **Cloudflare** (com Load Balancing)

#### Opção 2: Cloudflare com Load Balancing (Avançado)

Configure o Cloudflare como proxy do seu domínio e use Load Balancing para alternar entre Netlify e Vercel.

#### Opção 3: Script de Monitoramento Customizado (Avançado)

Crie um script que monitora o Netlify e atualiza o DNS automaticamente.

### 2.3 Solução Prática: UptimeRobot (Gratuito)

#### Passo 1: Criar Conta no UptimeRobot

1. Acesse: https://uptimerobot.com
2. Crie uma conta gratuita
3. Plano gratuito permite 50 monitors

#### Passo 2: Configurar Monitor

1. No UptimeRobot, clique em **Add New Monitor**
2. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Master League F1 - Netlify
   - **URL**: https://masterleaguef1.com.br
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: Seu email

#### Passo 3: Configurar Alertas

1. Configure alertas para quando o Netlify estiver offline
2. Quando receber alerta, você pode:
   - Atualizar DNS manualmente para apontar para Vercel
   - Ou usar webhook para automatizar (requer script)

### 2.4 Solução Avançada: Cloudflare com Failover

#### Passo 1: Mover DNS para Cloudflare

1. Crie conta no Cloudflare: https://cloudflare.com
2. Adicione seu domínio: `masterleaguef1.com.br`
3. Configure os nameservers no seu registrador de domínio

#### Passo 2: Configurar Load Balancing

1. No Cloudflare, vá em **Traffic** → **Load Balancing**
2. Crie um pool com:
   - **Origin 1**: Netlify (masterleaguef1.com.br)
   - **Origin 2**: Vercel (master-league-f1.vercel.app)
3. Configure health checks
4. Configure failover automático

**Custo**: Cloudflare Load Balancing é pago (~$5/mês)

### 2.5 Solução Simples: DNS Manual com Monitoramento

#### Configuração Manual de Fallback

1. **Configure DNS com TTL baixo** (300 segundos = 5 minutos)
2. **Use UptimeRobot** para monitorar Netlify
3. **Quando receber alerta**:
   - Acesse seu registrador de DNS
   - Altere o registro A/CNAME para apontar para Vercel
   - TTL baixo permite mudança rápida

**Tempo de propagação**: 5-15 minutos (com TTL baixo)

---

## 🛠️ PARTE 3: Configuração Completa Passo a Passo

### 3.1 Configurar Deploy Automático no Netlify

```bash
# Verificar se está linkado
npx netlify-cli status

# Se não estiver linkado ao Git:
# 1. Acesse https://app.netlify.com
# 2. Vá em Site settings → Build & deploy
# 3. Conecte ao GitHub
```

### 3.2 Configurar Deploy Automático no Vercel

```bash
# Verificar se está linkado
npx vercel link

# Se não estiver linkado:
# 1. Acesse https://vercel.com
# 2. Vá em Add New Project
# 3. Conecte ao GitHub e selecione o repositório
```

### 3.3 Configurar Monitoramento (UptimeRobot)

1. **Criar conta**: https://uptimerobot.com
2. **Adicionar monitor**:
   - URL: https://masterleaguef1.com.br
   - Tipo: HTTP(s)
   - Intervalo: 5 minutos
3. **Configurar alertas**:
   - Email quando Netlify estiver offline
   - SMS (opcional, pago)

### 3.4 Configurar DNS com TTL Baixo

No seu registrador de domínio (onde está o DNS):

```
Tipo: CNAME
Nome: @ (ou www)
Valor: masterleaguef1.netlify.app
TTL: 300 (5 minutos)
```

**Por que TTL baixo?**
- Permite mudança rápida em caso de falha
- Reduz tempo de propagação DNS

---

## 📊 Estratégia Recomendada

### Estratégia 1: Simples (Recomendada para Começar)

```
┌─────────────────────────────────────┐
│  Produção Principal                 │
│  Netlify: masterleaguef1.com.br     │
│  - Deploy automático via Git        │
│  - Monitoramento: UptimeRobot       │
└─────────────────────────────────────┘
              │
              ├─── Se falhar
              │
┌─────────────────────────────────────┐
│  Backup Manual                      │
│  Vercel: master-league-f1.vercel.app │
│  - Deploy automático via Git        │
│  - Atualizar DNS manualmente        │
└─────────────────────────────────────┘
```

**Vantagens:**
- ✅ Simples de configurar
- ✅ Sem custos adicionais
- ✅ Deploy automático em ambos

**Desvantagens:**
- ⚠️ Fallback requer ação manual
- ⚠️ Tempo de resposta: 5-15 minutos

### Estratégia 2: Avançada (Com Failover Automático)

```
┌─────────────────────────────────────┐
│  Cloudflare                         │
│  - DNS Management                    │
│  - Load Balancing                   │
│  - Health Checks                    │
└─────────────────────────────────────┘
              │
              ├─── Primary
              │
┌─────────────────────────────────────┐
│  Netlify: masterleaguef1.com.br     │
│  - Deploy automático                │
└─────────────────────────────────────┘
              │
              ├─── Failover (se falhar)
              │
┌─────────────────────────────────────┐
│  Vercel: master-league-f1.vercel.app │
│  - Deploy automático                │
└─────────────────────────────────────┘
```

**Vantagens:**
- ✅✅ Failover automático
- ✅✅ Tempo de resposta: < 1 minuto
- ✅✅ Alta disponibilidade

**Desvantagens:**
- ⚠️ Requer Cloudflare (pago para Load Balancing)
- ⚠️ Configuração mais complexa

---

## 🔧 Configuração Rápida - Comandos

### Verificar Status Atual

```bash
# Netlify
npx netlify-cli status

# Vercel
npx vercel ls
```

### Testar Deploy Automático

```bash
# Fazer alteração pequena
echo "<!-- Test $(date) -->" >> index.html

# Commit e push
git add index.html
git commit -m "Test: deploy automático"
git push origin main

# Aguardar 2-5 minutos e verificar:
# - Netlify: https://app.netlify.com/sites/masterleaguef1/deploys
# - Vercel: https://vercel.com/jmelogp-8099s-projects/master-league-f1
```

---

## 📝 Checklist de Configuração

### Deploy Automático
- [ ] Netlify conectado ao GitHub
- [ ] Vercel conectado ao GitHub
- [ ] Deploy automático ativado em ambos
- [ ] Testado com push no GitHub

### Fallback de Domínio
- [ ] UptimeRobot configurado (ou outro monitor)
- [ ] DNS com TTL baixo (300 segundos)
- [ ] Documentação de como fazer fallback manual
- [ ] (Opcional) Cloudflare Load Balancing configurado

### Monitoramento
- [ ] Alertas configurados no UptimeRobot
- [ ] Email de alerta configurado
- [ ] Testado alerta (simular falha)

---

## 🚨 Importante: Limitações

### O Que É Possível:
- ✅ Deploy automático em ambos (simultâneo)
- ✅ Monitoramento de disponibilidade
- ✅ Fallback manual rápido (com TTL baixo)

### O Que NÃO É Possível (sem serviços pagos):
- ❌ Failover automático instantâneo no DNS
- ❌ DNS não "sabe" se serviço está online
- ❌ Requer serviço intermediário (Cloudflare, etc.)

### Soluções:
- ✅ **Gratuito**: Monitoramento + fallback manual (5-15 min)
- ✅ **Pago**: Cloudflare Load Balancing (failover automático < 1 min)

---

## 💡 Recomendação Final

### Para Começar (Gratuito):
1. ✅ Configure deploy automático em ambos
2. ✅ Configure UptimeRobot para monitoramento
3. ✅ Configure DNS com TTL baixo
4. ✅ Documente processo de fallback manual

### Para Produção Crítica (Pago):
1. ✅ Configure Cloudflare Load Balancing
2. ✅ Configure health checks automáticos
3. ✅ Failover automático < 1 minuto

---

**Data**: Dezembro 2025  
**Versão**: 1.0



























