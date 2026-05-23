# Setup Supabase - Análises & Stewards System

## Etapas de Configuração

### 1. Criar as Tabelas (SQL)
No console SQL do Supabase, execute o script `supabase-schema.sql`:
```
1. Ir para: Supabase Dashboard > SQL Editor
2. Criar uma nova query
3. Copiar e colar o conteúdo de supabase-schema.sql
4. Executar
```

### 2. Popular Tabela PILOTOS
Os pilotos devem ser inseridos manualmente ou via script de import. Existem 3 formas:

**Opção A: Via SQL (Manual)**
```sql
INSERT INTO pilotos (nome, email, grid, equipe, whatsapp, is_steward) VALUES
('PILOTO1', 'piloto1@example.com', 'carreira', 'EQUIPE1', '+55 11 99999-9999', false),
('PILOTO2', 'piloto2@example.com', 'light', 'EQUIPE2', '+55 11 88888-8888', false),
('STEWARD_ADMIN', 'steward@example.com', 'carreira', 'STEWARDS', '+55 11 77777-7777', true);
```

**Opção B: Via Supabase UI**
1. Ir para: Supabase Dashboard > Table Editor
2. Selecionar tabela `pilotos`
3. Clicar "Insert" e adicionar manualmente

**Opção C: Criar Script Python (RECOMENDADO)**
```python
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import supabase

# Autenticar Google Sheets
gc = gspread.authorize(auth)
sheet = gc.open('SPREADSHEET_NAME').worksheet('INSCRIÇÃO T20')
rows = sheet.get_all_records()

# Conectar Supabase
supabase_client = supabase.create_client('URL', 'KEY')

# Inserir pilotos
for row in rows:
    supabase_client.table('pilotos').insert({
        'nome': row['P'].upper(),
        'email': row['N'] or row['I'],
        'grid': 'light' if 'light' in str(row['E']).lower() else 'carreira',
        'whatsapp': row['C'],
        'is_steward': False
    }).execute()
```

### 3. Criar Edge Function para Envio de Emails

No Supabase, crie uma Edge Function `send-email`:

```typescript
// supabase/functions/send-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { to, subject, html, templateType, logId } = await req.json();

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    });

    await client.send({
      from: SMTP_USER,
      to: to,
      subject: subject,
      content: html,
      mimeType: "text/html",
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

**Variáveis de Ambiente (Secrets):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=juliomelobr@hotmail.com
SMTP_PASS=sua_senha_app_gmail
```

### 4. Configurar Gmail App Password

1. Ir para: https://myaccount.google.com/apppasswords
2. Selecionar: Mail + Windows Computer
3. Copiar a senha gerada
4. Usar como SMTP_PASS no Supabase

### 5. Publicar Edge Function

```bash
supabase functions deploy send-email
```

### 6. Testar Conexão

No código React, testar:
```javascript
const { data, error } = await supabaseClient.functions.invoke('send-email', {
  body: {
    to: 'teste@example.com',
    subject: 'Teste',
    html: '<h1>Teste</h1>',
    templateType: 'acusacao_enviada'
  }
});
```

## Fluxo de Acusação/Defesa/Veredito

### 1. Piloto Envia Acusação
- Acessa `/analises`
- Clica "Enviar Acusação"
- Preenche: Piloto Acusado, Etapa, Descrição, Vídeo
- Clica "Enviar"

**Ações Automáticas:**
1. Gera código Lance: `STW-{Grid}{Season}{Round}{Order}`
2. Cria registro em `lances` table
3. Cria registro em `acusacoes` table
4. Envia email para acusador (confirmação)
5. Envia email para acusado (notificação)
6. Envia email para Stewards (admin alert)
7. Calcula deadline (Light: +1 dia 20:00 BRT)

### 2. Piloto Acusado Envia Defesa
- Clica "Enviar Defesa"
- Preenche: Descrição, Vídeo
- Sistema valida se está logado como acusado

**Ações Automáticas:**
1. Cria registro em `defesas` table
2. Envia email para defensor (confirmação)
3. Atualiza status de acusação

### 3. Stewards Analisam
- Acessam painel Stewards (requer `is_steward=true`)
- Visualizam acusação + defesa (vídeos lado a lado)
- Clicam "Emitir Veredito"
- Selecionam: Resultado (Absolvido/Culpado), Penalidade, Agravante, Explicação

**Ações Automáticas:**
1. Calcula pontos descontados baseado em penalidade
2. Verifica se total > 20pts (aplica race ban)
3. Cria registro em `verdicts` table
4. Envia email para acusador + acusado + stewards com resultado

### 4. Consulta Pública
- Qualquer piloto acessa "Consultar Lances"
- Vê lista de lances com:
  - Código (STW-...)
  - Videos lado a lado (acusação vs defesa)
  - Descrições
  - Veredito (se publicado)

## Segurança (Row Level Security)

✅ **Pilotos:** Podem ler próprias acusações/defesas
✅ **Stewards:** Podem ler tudo e emitir vereditos
✅ **Públicos:** Podem ler lances finalizados
❌ **Dados sensíveis:** Apenas emails dos Stewards recebem notificações

## Checklist de Deployment

- [ ] Tabelas criadas no Supabase
- [ ] Pilotos insertados na tabela `pilotos`
- [ ] Edge Function `send-email` criada e deployed
- [ ] Secrets (SMTP_HOST, SMTP_USER, SMTP_PASS) configurados
- [ ] Testes de email enviados com sucesso
- [ ] RLS policies testadas
- [ ] Frontend Análises.jsx em produção
- [ ] Testes E2E realizados (acusação → defesa → veredito)

## API Endpoints Futuros

Funções que ainda faltam criar:
- POST `/api/acusacoes` - Criar nova acusação
- POST `/api/defesas/{acusacao_id}` - Enviar defesa
- GET `/api/lances` - Listar lances
- POST `/api/verdicts` - Emitir veredito (admin only)
- GET `/api/verdicts/{lance_id}` - Consultar veredito

Estas podem ser criadas como:
1. **Supabase Postgres Functions** (SQL)
2. **Supabase Edge Functions** (TypeScript/JavaScript)
3. **Backend Node.js separado** (Express)
