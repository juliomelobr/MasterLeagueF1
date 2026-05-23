# 📱 Sistema de Notificações WhatsApp - Master League F1

**Data de Criação:** 27/01/2026  
**Versão:** 1.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Edge Function: send-whatsapp-code](#edge-function-send-whatsapp-code)
4. [Sistema de Horário Comercial](#sistema-de-horário-comercial)
5. [Tipos de Notificações](#tipos-de-notificações)
6. [Fluxos Detalhados](#fluxos-detalhados)
7. [Provedores de Envio](#provedores-de-envio)
8. [Scripts Auxiliares](#scripts-auxiliares)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de notificações WhatsApp da Master League F1 é responsável por enviar mensagens automáticas para pilotos, jurados e administradores em diversos momentos do sistema. Todas as notificações passam por uma **Edge Function** do Supabase que gerencia o envio através de provedores como **Twilio** ou **Z-API**.

### Características Principais:

- ✅ **Horário Comercial**: Notificações são bloqueadas fora do horário comercial (Seg-Sex, 08h-18h BRT)
- ✅ **Fallback Automático**: Tenta Twilio primeiro, depois Z-API se falhar
- ✅ **Mensagens Customizadas**: Suporta mensagens personalizadas ou padrão
- ✅ **Rastreamento**: Sistema marca notificações como enviadas no banco de dados
- ✅ **Retry Automático**: Notificações pendentes podem ser reenviadas

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  src/utils/whatsappNotify.js                         │  │
│  │  - sendWhatsappNotification()                        │  │
│  │  - Verifica horário comercial                         │  │
│  │  - Normaliza telefone                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  src/utils/emailService.js                           │  │
│  │  - notifyAccusedDefenseRequest()                     │  │
│  │  - notifyJuradosAguardandoAnalise()                  │  │
│  │  - notifyAdminNewAccusation()                        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  send-whatsapp-code/index.ts                          │  │
│  │  - Recebe requisição                                  │  │
│  │  - Formata telefone                                   │  │
│  │  - Tenta Twilio primeiro                              │  │
│  │  - Fallback para Z-API                                │  │
│  │  - Retorna resultado                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌───────────────┐                    ┌───────────────┐
│    Twilio     │                    │    Z-API      │
│  (Principal)  │                    │  (Fallback)   │
└───────────────┘                    └───────────────┘
```

---

## 🔧 Edge Function: send-whatsapp-code

**Localização:** `supabase/functions/send-whatsapp-code/index.ts`

### Responsabilidades:

1. **Receber requisições** do frontend via `supabase.functions.invoke()`
2. **Formatar número de telefone** para padrão internacional (55 + DDD + número)
3. **Escolher provedor** (Twilio ou Z-API) baseado em configuração
4. **Enviar mensagem** via API do provedor escolhido
5. **Retornar resultado** (sucesso ou erro)

### Parâmetros de Entrada:

```typescript
{
  email: string;              // Email do destinatário
  whatsapp: string;            // Número de WhatsApp (qualquer formato)
  nomePiloto: string;          // Nome do piloto/destinatário
  tipo: string;                // 'notificacao_aprovacao' ou 'codigo_verificacao'
  skipPilotoCheck?: boolean;   // Pular verificação de piloto no banco
  mensagemCustomizada?: string; // Mensagem personalizada (opcional)
}
```

### Tipos de Requisição:

#### 1. **Notificação de Aprovação** (`tipo: 'notificacao_aprovacao'`)

Usado para:
- Aprovação de novos pilotos
- Aprovação de ex-pilotos
- Notificações customizadas (defesas, acusações, etc.)

**Mensagem Padrão:**
```
✅ *ACESSO LIBERADO - MASTER LEAGUE F1*

Olá {nome},

Seu acesso ao Painel do Piloto foi *APROVADO*!

📋 *CADASTRE SUA SENHA E ACESSE:*

🔗 Link direto: https://www.masterleaguef1.com.br/ex-piloto/login

📝 *Passos:*
1️⃣ Clique no link acima
2️⃣ Digite seu e-mail: {email}
3️⃣ Valide seu WhatsApp com o código que será enviado
4️⃣ Crie sua senha de acesso
5️⃣ Pronto! Você terá acesso ao seu painel histórico

🏎️ Reveja a sua história na Master League F1
```

#### 2. **Código de Verificação** (`tipo: 'codigo_verificacao'` ou padrão)

Usado para:
- Autenticação 2FA no login
- Verificação de WhatsApp

**Mensagem:**
```
🔐 CÓDIGO DE VERIFICAÇÃO - MASTER LEAGUE F1

Olá {nome}!

Seu código de verificação é:

{CODIGO_6_DIGITOS}

Este código expira em 10 minutos.
```

### Variáveis de Ambiente Necessárias:

```bash
# Twilio (Principal)
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Z-API (Fallback)
ZAPI_INSTANCE=xxxxx
ZAPI_TOKEN=xxxxx
ZAPI_CLIENT_TOKEN=xxxxx (opcional)

# Tipo de API (opcional, auto-detecta)
WHATSAPP_API_TYPE=twilio
```

---

## ⏰ Sistema de Horário Comercial

**Localização:** `src/utils/businessHours.js`

### Regras:

- **Dias Úteis**: Segunda a Sexta-feira
- **Horário**: 08:00 às 17:59 (horário de Brasília - BRT)
- **Fim de Semana**: Sábado e Domingo = **BLOQUEADO**

### Implementação:

```javascript
export function isBusinessHours() {
  const brtNow = getCurrentBRT();
  const dayOfWeek = brtNow.getDay(); // 0 = Domingo, 6 = Sábado
  const hours = brtNow.getHours();

  // Fim de semana bloqueado
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Segunda a Sexta, das 08:00 às 17:59
  return hours >= 8 && hours < 18;
}
```

### Comportamento:

- ✅ **Dentro do horário**: Notificação é enviada normalmente
- ❌ **Fora do horário**: Notificação é **silenciada** (não envia, mas não gera erro)
- 📝 **Retorno**: `{ success: false, error: "Notificações silenciadas...", silenced: true }`

### Exceções:

Alguns fluxos **ignoram** o horário comercial:
- Scripts manuais (`scripts/notificar_defesas_pendentes.js`)
- Chamadas diretas à Edge Function com `skipPilotoCheck: true`

---

## 📨 Tipos de Notificações

### 1. **Notificação para Piloto Acusado** (Defesa Pendente)

**Função:** `notifyAccusedDefenseRequest()`  
**Localização:** `src/utils/emailService.js:511`

**Quando é enviada:**
- Quando um piloto cria uma acusação contra outro
- Status da acusação = `'aguardando_defesa'`
- Apenas para acusações normais (não retirada de bug)

**Mensagem:**
```
🛡️ *VOCÊ FOI ACUSADO - MASTER LEAGUE F1*

🔖 *Código:* STW-L2008
👤 *Acusador:* RICHARD SALES
🏁 *Etapa:* 3 - Texas

📝 *Descrição:*
[Descrição da acusação]

🎥 *Vídeo do lance:*
[Link do vídeo]

⏰ *Prazo:* até *12:00h do dia seguinte*.
✅ Envie o *vídeo de defesa* pelo *link verde do Motorhome*.

🔗 Motorhome: https://masterleaguef1.com.br/dashboard
```

**Chamada:**
```javascript
// src/pages/FormularioAcusacao.jsx:338
notifyAccusedDefenseRequest({
  dadosAcusacao,
  acusado: {
    nome: pilotoAcusadoSelecionado?.nome,
    email: pilotoAcusadoSelecionado?.email,
    whatsapp: pilotoAcusadoSelecionado?.whatsapp,
  },
})
```

**Comportamento:**
- ✅ Respeita horário comercial
- ❌ Se fora do horário, notificação é silenciada
- 📝 Script `notificar_defesas_pendentes.js` pode reenviar pendentes

---

### 2. **Notificação para Jurados** (Novo Lance para Análise)

**Função:** `notifyJuradosAguardandoAnalise()`  
**Localização:** `src/utils/emailService.js:102`

**Quando é enviada:**
- Quando um admin aprova uma acusação e muda status para `'aguardando_analise'`
- Enviada para **todos os jurados ativos** do banco de dados

**Mensagem:**
```
👨‍⚖️ *NOVO LANCE PARA ANÁLISE - MASTER LEAGUE F1*

🔖 *Código:* STW-L2008
🏁 *Etapa:* 3 - Texas
🏎️ *Grid:* LIGHT
👤 *Acusador:* RICHARD SALES
🎯 *Acusado:* João Darth

📋 *Acesse o Painel do Júri para analisar:*
🔗 https://masterleaguef1.com.br/veredito

⏰ 27/01/2026, 10:01:44
```

**Chamada:**
```javascript
// src/pages/Admin.jsx:1054
await notifyJuradosAguardandoAnalise({
  notifId: notificacao.id,
  dadosNotificacao: dadosAtualizados,
  messageData: dadosAtualizados,
});
```

**Comportamento:**
- ✅ Respeita horário comercial
- 📝 Se fora do horário, marca como `juradosNotificacaoPendente: true`
- 🔄 Função `flushPendingJuradoNotifications()` reenvia pendentes

---

### 3. **Notificação de Aprovação de Piloto**

**Função:** `enviarNotificacaoAprovacao()`  
**Localização:** `src/pages/Admin.jsx:1318`

**Quando é enviada:**
- Quando admin aprova um novo piloto
- Quando admin aprova um ex-piloto

**Mensagem:**
```
✅ *ACESSO LIBERADO - MASTER LEAGUE F1*

Olá {nome},

Seu acesso ao Painel do Piloto foi *APROVADO*!

📋 *CADASTRE SUA SENHA E ACESSE:*

🔗 Link direto: https://www.masterleaguef1.com.br/ex-piloto/login

📝 *Passos:*
1️⃣ Clique no link acima
2️⃣ Digite seu e-mail: {email}
3️⃣ Valide seu WhatsApp com o código que será enviado
4️⃣ Crie sua senha de acesso
5️⃣ Pronto! Você terá acesso ao seu painel histórico

🏎️ Reveja a sua história na Master League F1
```

**Chamada:**
```javascript
// src/pages/Admin.jsx:1187
await enviarNotificacaoAprovacao(email, nomePiloto, whatsapp, false);
```

---

### 4. **Notificação de Contrato Fechado**

**Função:** `notifyPilotoContrato()`  
**Localização:** `src/pages/Dashboard.jsx:485`

**Quando é enviada:**
- Quando um piloto fecha contrato com uma equipe
- Enviada para o piloto que fechou o contrato

**Mensagem:**
```
🎉 PARABÉNS! CONTRATO FECHADO - MASTER LEAGUE F1

Olá {nome}!

✅ Seu contrato foi fechado com sucesso!

Equipe: {teamName}
Grid: {grid}
Temporada: 20

Bem-vindo à sua nova equipe! 🏎️

Horário: {timestamp}
```

---

### 5. **Notificação de Propostas Expiradas**

**Função:** `cancelarPropostasExpiradas()`  
**Localização:** `src/pages/Dashboard.jsx:522`

**Quando é enviada:**
- Quando propostas de equipes expiram (após 10 horas)
- Enviada para o piloto e para o admin

**Mensagem para Piloto:**
```
⏰ TEMPO ESGOTADO - MASTER LEAGUE F1

Olá {nome}!

O prazo de 10 horas para responder às propostas recebidas expirou.
As propostas das seguintes equipes foram automaticamente canceladas:

1. {equipe1}
2. {equipe2}

Você ainda pode receber novas propostas de outras equipes.

🔗 Painel do Piloto: https://masterleaguef1.com.br/dashboard
```

**Mensagem para Admin:**
```
⏰ PROPOSTAS EXPIRADAS - MASTER LEAGUE F1

Piloto: {nome}
Grid: {grid}
COD IDML: {codIdml}
Email: {email}
Quantidade de propostas expiradas: {quantidade}
Equipes: {lista}

As propostas foram automaticamente canceladas por falta de resposta dentro do prazo de 10 horas.
```

---

### 6. **Notificação de Caixa de Mensagens Aberta**

**Função:** `notifyAdminOpenInbox()`  
**Localização:** `src/pages/Dashboard.jsx:439`

**Quando é enviada:**
- Quando um piloto abre a caixa de mensagens no dashboard
- Enviada apenas para o admin

**Mensagem:**
```
📬 PILOTO ABRIU CAIXA DE MENSAGENS

Piloto: {nome}
Grid: {grid}
COD IDML: {codIdml}
Email: {email}
Horário: {timestamp}
```

---

### 7. **Notificação de Admin (CallMeBot)**

**Função:** `sendWhatsAppMessage()` (CallMeBot)  
**Localização:** `src/utils/emailService.js:207`

**Quando é enviada:**
- Notificações para admin via CallMeBot API (gratuito)
- Usado para notificações de novas acusações

**Configuração:**
```javascript
const WHATSAPP_RECIPIENTS = [
  { phone: '555183433940', apikey: '6022419', nome: 'Admin' },
  { phone: '5511940133084', apikey: '3666307', nome: 'Edvan Paiva' },
];
```

**Comportamento:**
- ✅ Respeita horário comercial
- 📤 Envia para todos os destinatários configurados
- ⏱️ Delay de 1 segundo entre envios

---

## 🔄 Fluxos Detalhados

### Fluxo 1: Acusação Criada → Notificação para Acusado

```
1. Piloto cria acusação
   └─> FormularioAcusacao.jsx:handleSubmit()

2. Sistema gera código do lance
   └─> gerarCodigoLance()

3. Notifica admin (background)
   └─> notifyAdminNewAccusation()
       └─> Salva no banco (notificacoes_admin)
       └─> Envia CallMeBot (se horário comercial)

4. Notifica piloto acusado (se status = 'aguardando_defesa')
   └─> notifyAccusedDefenseRequest()
       └─> Verifica horário comercial
       ├─> Se DENTRO: sendWhatsappNotification()
       │   └─> Edge Function send-whatsapp-code
       │       ├─> Tenta Twilio
       │       └─> Se falhar: Tenta Z-API
       └─> Se FORA: Silencia (retorna { silenced: true })
```

### Fluxo 2: Admin Aprova Acusação → Notificação para Jurados

```
1. Admin aprova acusação
   └─> Admin.jsx:handleAprovarAcusacao()

2. Status muda para 'aguardando_analise'
   └─> Atualiza notificacoes_admin

3. Notifica todos os jurados ativos
   └─> notifyJuradosAguardandoAnalise()
       └─> Busca jurados ativos no banco
       └─> Para cada jurado:
           ├─> Verifica horário comercial
           ├─> Se DENTRO: Envia WhatsApp
           └─> Se FORA: Marca como pendente
               └─> juradosNotificacaoPendente: true

4. Reenvio de pendentes (quando necessário)
   └─> flushPendingJuradoNotifications()
       └─> Busca notificações pendentes
       └─> Reenvia se dentro do horário
```

### Fluxo 3: Login → Código de Verificação 2FA

```
1. Piloto tenta fazer login
   └─> Login.jsx:handleSubmit()

2. Sistema gera código de 6 dígitos
   └─> whatsappAuth.js:sendVerificationCode()

3. Chama Edge Function
   └─> supabase.functions.invoke('send-whatsapp-code')
       └─> tipo: 'codigo_verificacao' (ou padrão)
       └─> Gera código aleatório
       └─> Envia via Twilio/Z-API

4. Piloto recebe código no WhatsApp
   └─> Digita código no formulário
   └─> Sistema valida código
```

---

## 🌐 Provedores de Envio

### Twilio (Principal)

**Configuração:**
- **Account SID**: `TWILIO_ACCOUNT_SID`
- **Auth Token**: `TWILIO_AUTH_TOKEN`
- **WhatsApp Number**: `TWILIO_WHATSAPP_NUMBER` (formato: `whatsapp:+14155238886`)

**Endpoint:**
```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

**Formato de Telefone:**
- Entrada: Qualquer formato (ex: `5511983433940`, `11983433940`)
- Saída: `+5511983433940` (formato internacional)

**Resposta de Sucesso:**
- HTTP Status: `200` ou `201`
- Body: `{ status: 'queued' | 'sent' | 'delivered', sid: '...' }`

---

### Z-API (Fallback)

**Configuração:**
- **Instance**: `ZAPI_INSTANCE`
- **Token**: `ZAPI_TOKEN`
- **Client Token**: `ZAPI_CLIENT_TOKEN` (opcional, para segurança)

**Endpoint:**
```
POST https://api.z-api.io/instances/{instance}/token/{token}/send-text
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Client-Token": "{ZAPI_CLIENT_TOKEN}" // Opcional
}
```

**Body:**
```json
{
  "phone": "5511983433940",
  "message": "Mensagem aqui"
}
```

**Resposta de Sucesso:**
- HTTP Status: `200`
- Body: `{ success: true, ... }`

---

### Estratégia de Fallback

```
1. Tenta Twilio primeiro
   └─> Se sucesso: Retorna ✅
   └─> Se falha: Continua para Z-API

2. Tenta Z-API (se Twilio falhou)
   └─> Se sucesso: Retorna ✅
   └─> Se falha: Retorna ❌
```

---

## 🛠️ Scripts Auxiliares

### 1. `scripts/notificar_defesas_pendentes.js`

**Propósito:** Enviar notificações pendentes para pilotos acusados que não receberam notificação (porque foram criadas fora do horário comercial).

**Uso:**
```bash
# Verificar pendentes (dry-run)
node scripts/notificar_defesas_pendentes.js --dry-run

# Enviar notificações
node scripts/notificar_defesas_pendentes.js --send

# Limitar quantidade
node scripts/notificar_defesas_pendentes.js --send --limit=10
```

**O que faz:**
1. Busca acusações com status `'aguardando_defesa'`
2. Filtra apenas as que não têm `notificacaoEnviada: true`
3. Envia mensagem WhatsApp para cada piloto acusado
4. Marca como enviada no banco de dados

**Variáveis de Ambiente:**
```bash
SUPABASE_URL=https://ueqfmjwdijaeawvxhdtp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

---

## 🔍 Troubleshooting

### Problema: Notificações não estão sendo enviadas

**Possíveis Causas:**

1. **Fora do horário comercial**
   - ✅ Verificar: `isBusinessHours()` retorna `false`
   - 🔧 Solução: Aguardar horário comercial ou usar script manual

2. **Edge Function não deployada**
   - ✅ Verificar: https://app.supabase.com/project/xxx/functions
   - 🔧 Solução: Fazer deploy da função `send-whatsapp-code`

3. **Variáveis de ambiente não configuradas**
   - ✅ Verificar: Supabase Dashboard → Edge Functions → Secrets
   - 🔧 Solução: Configurar `TWILIO_*` ou `ZAPI_*`

4. **Telefone inválido**
   - ✅ Verificar: Formato do número
   - 🔧 Solução: Usar `normalizePhone()` para formatar

### Problema: Notificações duplicadas

**Causa:** Sistema não está marcando como enviada

**Solução:**
- Verificar se campo `notificacaoEnviada` está sendo atualizado
- Verificar logs da Edge Function

### Problema: Twilio falha, mas Z-API funciona

**Causa:** Configuração do Twilio incorreta

**Solução:**
- Verificar `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN`
- Verificar formato do `TWILIO_WHATSAPP_NUMBER` (deve ser `whatsapp:+14155238886`)

### Problema: Notificações pendentes não são reenviadas

**Solução:**
- Chamar `flushPendingJuradoNotifications()` manualmente
- Ou usar script `notificar_defesas_pendentes.js`

---

## 📊 Estrutura de Dados

### Tabela: `notificacoes_admin`

**Campos relevantes:**
```json
{
  "id": "uuid",
  "tipo": "nova_acusacao",
  "dados": {
    "codigoLance": "STW-L2008",
    "status": "aguardando_defesa" | "aguardando_analise",
    "notificacaoEnviada": true,  // Marca se notificação foi enviada
    "notificacaoEnviadaEm": "2026-01-27T10:00:00Z",
    "juradosNotificacaoPendente": true,  // Marca se jurados não foram notificados
    "juradosNotificacaoEnviadaEm": "2026-01-27T10:00:00Z",
    "acusado": {
      "nome": "João Darth",
      "whatsapp": "5511983433940",
      "email": "joao@example.com"
    },
    "acusador": {
      "nome": "Richard Sales",
      "whatsapp": "5511940133084"
    }
  }
}
```

---

## 📝 Notas Importantes

1. **Horário Comercial é OBRIGATÓRIO** para a maioria das notificações
2. **Scripts manuais** podem ignorar horário comercial
3. **Twilio é preferencial**, Z-API é fallback
4. **Telefones devem ser formatados** para padrão internacional (55 + DDD + número)
5. **Notificações são assíncronas** - não bloqueiam o fluxo principal
6. **Sistema marca notificações** como enviadas para evitar duplicatas

---

## 🔗 Links Úteis

- **Logs da Edge Function:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-whatsapp-code/logs
- **Dashboard Twilio:** https://console.twilio.com/
- **Documentação Twilio WhatsApp:** https://www.twilio.com/docs/whatsapp
- **Documentação Z-API:** https://developer.z-api.io/

---

**Última Atualização:** 27/01/2026  
**Autor:** Sistema Master League F1
