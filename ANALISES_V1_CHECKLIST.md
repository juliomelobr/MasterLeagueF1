# Implementação Análises V1 - Checklist de Deploy

## ✅ O que foi feito:

### Frontend
- [x] **Análises.jsx** (900+ linhas)
  - Tab: Acusação (dropdown pilotos, etapa, descrição, vídeo)
  - Tab: Defesa (descrição, vídeo)
  - Tab: Consulta (visualizar lances com vídeos lado a lado)
  - Tab: Stewards (admin panel com formulário de veredito + lista pendentes)
  - Autenticação: Verifica se piloto está logado
  - Validação: Deadline Grid Light (+1 dia 20:00 BRT)

- [x] **useAnalises.js** (Hook de utilitários)
  - `usePilotosData()` - Carrega pilotos da planilha
  - `generateLanceCode()` - Gera STW-C190301
  - `calculatePenaltyPoints()` - Calcula pontos (Leve=5, Média=10, Grave=15, Gravíssima=20, +5 agravante)
  - `getBRTDeadline()` - Calcula deadline em BRT
  - `isDeadlineExceeded()` - Valida deadline

- [x] **emailService.js** (Utilitários de email)
  - `sendEmailNotification()` - Envia email via Edge Function
  - Templates: acusacao_enviada, acusacao_recebida_acusado, defesa_enviada, veredito_notificacao, admin_nova_acusacao

- [x] **App.jsx** - Rota /analises adicionada
- [x] **Navbar.jsx** - Link "ANÁLISES" adicionado

### Banco de Dados
- [x] **supabase-schema.sql** (300+ linhas SQL)
  - Tabelas: `pilotos`, `lances`, `acusacoes`, `defesas`, `verdicts`, `email_log`
  - Índices otimizados
  - Row Level Security (RLS) policies

### Documentação
- [x] **SUPABASE_SETUP.md** - Guia completo de setup

---

## ⚠️ O que ainda PRECISA fazer:

### Passo 1: Setup Supabase (CRÍTICO)
```sql
-- No console SQL do Supabase, executar: supabase-schema.sql
```

### Passo 2: Popular Tabela PILOTOS
Opção A: Manual via UI Supabase
Opção B: Via Google Sheets API (ver SUPABASE_SETUP.md)
Opção C: SQL manual

### Passo 3: Criar Edge Function
Arquivo: `supabase/functions/send-email/index.ts`
(Código em SUPABASE_SETUP.md)

### Passo 4: Configurar Secrets
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=juliomelobr@hotmail.com
- SMTP_PASS=<app_password_do_gmail>

### Passo 5: Testar Tudo
```javascript
// No console do browser, acessando /analises
// 1. Fazer login como piloto
// 2. Enviar acusação
// 3. Verificar email recebido
// 4. Fazer login como steward
// 5. Emitir veredito
// 6. Verificar emails de notificação
```

---

## 📊 Fluxo Completo

```
1. PILOTO acusa outro
   ↓
   - Gera código STW-C190301
   - Valida deadline (Light: +1 dia 20:00)
   - Insere em: lances, acusacoes
   - Envia 3 emails: acusador, acusado, stewards

2. PILOTO acusado defende
   ↓
   - Insere em: defesas
   - Atualiza acusacao.status → "contestada"
   - Envia 2 emails: acusado, acusador

3. STEWARD analisa
   ↓
   - Vê acusação + defesa (vídeos lado a lado)
   - Emite veredito
   - Calcula pontos (0-20+5)
   - Aplica race_ban se >20 pontos
   - Envia 3 emails: acusado, acusador, stewards

4. PÚBLICO consulta
   ↓
   - Vê lista de lances finalizados
   - Visualiza acusação vs defesa com vídeos
```

---

## 🔐 Segurança (RLS)

| Tabela | Ler | Escrever |
|--------|-----|----------|
| pilotos | Público | Admin |
| lances | Público | Autenticado |
| acusacoes | Próprias + Stewards | Autenticado |
| defesas | Próprias + Stewards | Autenticado |
| verdicts | Apenas Stewards | Apenas Stewards |
| email_log | Apenas Stewards | Apenas Stewards |

---

## 🚀 Deploy Checklist

- [ ] Tabelas Supabase criadas (supabase-schema.sql)
- [ ] Pilotos inseridos na tabela `pilotos`
- [ ] Edge Function `send-email` criada
- [ ] Secrets SMTP configurados
- [ ] Teste de email: `npm run dev` → `/analises` → enviar acusação
- [ ] Verificar emails recebidos
- [ ] Testar painel Stewards
- [ ] Verificar veredito com race_ban
- [ ] Conferir template de emails
- [ ] Ir ao vivo!

---

## 📞 Suporte

Se tiver dúvidas:
1. Ver SUPABASE_SETUP.md
2. Conferir console do browser (F12)
3. Ver logs Supabase: https://app.supabase.com/project/[seu-project]/api/realtime
4. Debugar com: `console.log()` no React

---

## 📝 Notas

- Todas as validações estão no frontend, mas RLS no backend garante segurança
- Emails são assincronos (não bloqueiam a UX)
- Deadline BRT é convertido automaticamente
- Pontos de penalidade são imutáveis (salvos em `verdicts`)
- Pilotos só veem lances fechados de outros (Consulta)
- Stewards veem tudo

Good luck! 🎉
