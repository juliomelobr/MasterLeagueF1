# 🔐 Sistema de Autenticação em 2 Etapas - WhatsApp

## 📋 Visão Geral

Sistema robusto de autenticação em 2 etapas usando código de verificação via WhatsApp para garantir que apenas pilotos inscritos no campeonato acessem o painel.

## 🏗️ Arquitetura

### 1. Fluxo de Autenticação

```
1. Piloto acessa /login
2. Login com Google OAuth
3. Sistema verifica email na tabela 'pilotos' (Supabase)
   ├─ Se NÃO encontrado → Erro: "Não está inscrito"
   └─ Se encontrado → Continua
4. Verifica se tem WhatsApp cadastrado
   ├─ Se NÃO tem → Pede WhatsApp
   └─ Se tem → Usa WhatsApp cadastrado
5. Envia código de 6 dígitos via WhatsApp (Edge Function)
6. Piloto digita código
7. Sistema valida código (Edge Function)
   ├─ Se válido → Autentica e redireciona para /dashboard
   └─ Se inválido → Mostra erro e permite nova tentativa
```

### 2. Componentes Criados

- ✅ `supabase-schema-auth.sql` - Tabela de códigos de verificação
- ✅ `supabase/functions/send-whatsapp-code/index.ts` - Edge Function para envio de código
- ✅ `src/utils/whatsappAuth.js` - Utilitários para gerenciar códigos

### 3. Próximos Passos

- ⏳ Atualizar `src/pages/Login.jsx` - Implementar novo fluxo
- ⏳ Atualizar `src/pages/Dashboard.jsx` - Proteger rota e verificar autenticação
- ⏳ Configurar sincronização automática Google Sheets → Supabase

---

## 📦 Instalação e Configuração

### Passo 1: Criar Tabela no Supabase

Execute no SQL Editor do Supabase:

```sql
-- Copiar conteúdo de supabase-schema-auth.sql e executar
```

Isso criará a tabela `whatsapp_verification_codes` com as políticas de segurança.

### Passo 2: Criar Edge Function

1. No Supabase Dashboard, vá em **Edge Functions**
2. Clique em **Create a new function**
3. Nome: `send-whatsapp-code`
4. Copie o conteúdo de `supabase/functions/send-whatsapp-code/index.ts`
5. Clique em **Deploy**

### Passo 3: Configurar Secrets (Variáveis de Ambiente)

No Supabase Dashboard > Edge Functions > Secrets, adicione:

**Opção A: CallMeBot (Gratuito, fácil, limitado)**
```
WHATSAPP_API_TYPE=callmebot
CALLMEBOT_PHONE=555183433940
CALLMEBOT_APIKEY=sua_apikey_aqui
```

**Opção B: Z-API (Recomendado para produção - Brasileiro)**
```
WHATSAPP_API_TYPE=zapi
ZAPI_INSTANCE=sua_instance
ZAPI_TOKEN=seu_token
ZAPI_PHONE_ID=seu_phone_id
```

**Opção C: Twilio (Profissional, pago)**
```
WHATSAPP_API_TYPE=twilio
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+5511999999999
```

### Passo 4: Configurar CallMeBot (Se usar opção A)

1. Adicione o número `+34 644 52 65 23` aos seus contatos do WhatsApp
2. Envie a mensagem: `I allow callmebot to send me messages`
3. Você receberá uma apikey
4. Adicione a apikey no secret `CALLMEBOT_APIKEY`

⚠️ **Limitação**: CallMeBot envia para um número fixo (o que você configura). Para enviar para qualquer número, use Z-API ou Twilio.

---

## 🔄 Fluxo de Código - Implementação

### Atualizar Login.jsx

O arquivo `Login.jsx` precisa ser atualizado para:

1. **Verificar piloto no Supabase** (não mais na planilha)
2. **Pedir WhatsApp** se não tiver cadastrado
3. **Enviar código** via Edge Function
4. **Validar código** digitado pelo usuário
5. **Autenticar** e redirecionar para dashboard

### Estados necessários:

```javascript
const [step, setStep] = useState('login'); // 'login', 'whatsapp', 'code', 'success'
const [pilotoData, setPilotoData] = useState(null); // Dados do piloto do Supabase
const [whatsappInput, setWhatsappInput] = useState('');
const [codeInput, setCodeInput] = useState('');
const [sendingCode, setSendingCode] = useState(false);
const [verifyingCode, setVerifyingCode] = useState(false);
```

### Funções principais:

```javascript
// 1. Verificar se piloto existe
const checkPilotoInSupabase = async (email) => {
  const { data, error } = await supabase
    .from('pilotos')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  
  if (error || !data) {
    // Piloto não encontrado
    return null;
  }
  
  return data;
};

// 2. Enviar código
const handleSendCode = async () => {
  setSendingCode(true);
  const result = await requestVerificationCode(
    user.email,
    whatsappInput,
    pilotoData?.nome
  );
  
  if (result.success) {
    setStep('code');
  } else {
    setErrorMsg(result.error);
  }
  setSendingCode(false);
};

// 3. Validar código
const handleVerifyCode = async () => {
  setVerifyingCode(true);
  const result = await verifyCode(user.email, codeInput);
  
  if (result.success && result.valid) {
    // Código válido - autenticar e redirecionar
    navigate('/dashboard');
  } else {
    setErrorMsg(result.error || 'Código inválido');
  }
  setVerifyingCode(false);
};
```

---

## 🛡️ Proteção do Dashboard

Atualizar `Dashboard.jsx` para verificar autenticação:

```javascript
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/login');
      return;
    }
    
    // Verificar se piloto existe e está validado
    const { data: piloto } = await supabase
      .from('pilotos')
      .select('*')
      .eq('email', session.user.email.toLowerCase())
      .single();
    
    if (!piloto || !piloto.whatsapp) {
      // Piloto não validado ainda
      navigate('/login');
      return;
    }
    
    // Autenticado e validado - pode acessar dashboard
    setPiloto(piloto);
  };
  
  checkAuth();
}, []);
```

---

## 🔄 Sincronização Google Sheets → Supabase

Para garantir que os pilotos da planilha estejam sempre no Supabase:

### Opção 1: Sincronização Manual (Admin)

Criar botão no painel Admin (`/admin`) que chama `syncPilotosFromSheet()`

### Opção 2: Sincronização Automática (Cron)

Adicionar ao `sync-scheduler` existente:

```typescript
// Em supabase/functions/sync-scheduler/index.ts
async function syncPilotos() {
  // Chamar função de sincronização
  // Executar a cada hora
}
```

---

## 📝 Checklist de Implementação

- [x] Criar schema SQL para códigos de verificação
- [x] Criar Edge Function para envio de código
- [x] Criar utilitários de autenticação WhatsApp
- [ ] Atualizar Login.jsx com novo fluxo
- [ ] Atualizar Dashboard.jsx com proteção de rota
- [ ] Configurar API WhatsApp (CallMeBot/Z-API/Twilio)
- [ ] Testar fluxo completo
- [ ] Configurar sincronização automática Sheets → Supabase

---

## 🐛 Troubleshooting

### Código não está chegando no WhatsApp

1. Verifique os secrets configurados no Supabase
2. Para CallMeBot, verifique se a apikey está correta
3. Para Z-API, verifique se a instance está ativa
4. Veja os logs da Edge Function no Supabase Dashboard

### "Piloto não encontrado" mesmo estando inscrito

1. Verifique se o email na tabela `pilotos` está em lowercase
2. Execute sincronização manual: `syncPilotosFromSheet()`
3. Verifique se o email do Google OAuth bate com o email na tabela

### Código expira muito rápido

O código expira em 10 minutos por padrão. Para alterar, edite:
- Edge Function: `expiresAt.setMinutes(expiresAt.getMinutes() + 10)`
- Tabela: campo `expires_at`

---

## 📚 Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [CallMeBot API](https://www.callmebot.com/blog/free-api-whatsapp-messages/)
- [Z-API Documentation](https://developer.z-api.io/)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)








































