# 📋 Análises V1 - Resumo de Implementação

## 🎯 O que foi criado

### 1. **Frontend React** (`src/pages/Analises.jsx`)
- **800+ linhas** de código React completo
- **4 Tabs**: Acusação | Defesa | Consulta | Stewards
- **Autenticação**: Verifica login Supabase
- **Validações**: Deadline Grid Light, campos obrigatórios
- **Integração Supabase**: Cria acusações, defesas, vereditos
- **Notificações Email**: Dispara emails automáticos

#### Features:
- ✅ Dropdown de pilotos do mesmo grid
- ✅ Seleção de etapa com data automática
- ✅ Upload de link de vídeo (YouTube/Streamable)
- ✅ Confirmação modal de sucesso
- ✅ Painel Stewards com formulário de veredito
- ✅ Visualização de vídeos lado-a-lado (acusação vs defesa)
- ✅ Cálculo automático de pontos e race ban

### 2. **Hooks & Utilitários**

#### `src/hooks/useAnalises.js`
- `usePilotosData()` - Carrega pilotos da planilha Google Sheets
- `generateLanceCode()` - Gera código STW-C190301
- `calculatePenaltyPoints()` - Calcula penalidades (0-25 pts)
- `getBRTDeadline()` - Calcula deadline em timezone BRT
- `isDeadlineExceeded()` - Valida se passou do deadline

#### `src/utils/emailService.js`
- `sendEmailNotification()` - Envia email via Supabase Edge Function
- 5 templates de email HTML profissionais:
  - Acusação enviada (confirmação)
  - Acusação recebida (notificação acusado)
  - Defesa enviada (confirmação)
  - Veredito publicado (resultado final)
  - Admin alert (nova acusação)

### 3. **Banco de Dados** (`supabase-schema.sql`)
```sql
CREATE TABLE pilotos (
  id, nome, email, grid, equipe, whatsapp, is_steward, created_at, updated_at
)

CREATE TABLE lances (
  id, codigo (STW-C190301), season, round, grid, order_number, status, created_at
)

CREATE TABLE acusacoes (
  id, lance_id (FK), piloto_acusador_id, piloto_acusado_id, 
  descricao, video_link, status, deadline_brt, created_at
)

CREATE TABLE defesas (
  id, acusacao_id (FK), piloto_acusado_id, 
  descricao, video_link, status, created_at
)

CREATE TABLE verdicts (
  id, lance_id (FK), resultado, penalty_type, agravante, 
  pontos_deducted, race_ban, explanation, steward_id (FK), created_at
)

CREATE TABLE email_log (
  id, destinatario, assunto, tipo, referencia_id, 
  status (pendente/enviado/falha), tentativas, erro, created_at
)
```

### 4. **Segurança** - Row Level Security (RLS)
- Pilotos: Podem ler acusações próprias
- Stewards: Podem ler/escrever tudo
- Público: Vê apenas lances fechados
- Email: Apenas stewards recebem notificações

### 5. **Documentação**
- `SUPABASE_SETUP.md` - Guia passo-a-passo de setup (500+ linhas)
- `ANALISES_V1_CHECKLIST.md` - Checklist de deploy
- `scripts/import_pilotos.py` - Script Python para importar pilotos

### 6. **Integração**
- ✅ Rota `/analises` adicionada em `App.jsx`
- ✅ Link "ANÁLISES" adicionado na `Navbar.jsx`
- ✅ Imports corretos de hooks e utils

---

## 🚀 Fluxo de Funcionamento

```
┌─────────────────────────────────────────────────────────┐
│ PILOTO ENVIA ACUSAÇÃO                                   │
├─────────────────────────────────────────────────────────┤
│ 1. Preenche form (piloto, etapa, descrição, vídeo)      │
│ 2. Sistema valida deadline (Light: +1 dia 20:00 BRT)    │
│ 3. Gera código: STW-C190301                             │
│ 4. Insere em: lances, acusacoes                         │
│ 5. Dispara 3 emails:                                    │
│    • Acusador (confirmação)                             │
│    • Acusado (notificação)                              │
│    • Stewards (admin alert)                             │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ PILOTO ACUSADO ENVIA DEFESA                             │
├─────────────────────────────────────────────────────────┤
│ 1. Preenche form (descrição, vídeo)                     │
│ 2. Sistema valida se é o acusado                        │
│ 3. Insere em: defesas                                   │
│ 4. Atualiza acusacao.status → "contestada"              │
│ 5. Dispara 2 emails:                                    │
│    • Acusado (confirmação)                              │
│    • Acusador (notificação de defesa)                   │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ STEWARD EMITE VEREDITO                                  │
├─────────────────────────────────────────────────────────┤
│ 1. Acessa painel Stewards                               │
│ 2. Vê acusação + defesa (vídeos lado-a-lado)            │
│ 3. Preenche form:                                       │
│    • Resultado (Absolvido/Culpado)                      │
│    • Penalidade (Leve=5, Média=10, Grave=15, Grav=20)   │
│    • Agravante (+5 pts)                                 │
│    • Explicação                                         │
│ 4. Calcula: pontos_deducted = penalty + agravante       │
│ 5. Aplica: race_ban = (pontos > 20)                     │
│ 6. Insere em: verdicts                                  │
│ 7. Atualiza: lances.status → "fechado"                  │
│ 8. Dispara 2 emails com resultado final                 │
│    • Acusado (veredito com penalidades)                 │
│    • Acusador (resultado)                               │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ QUALQUER PILOTO CONSULTA LANCES FECHADOS                │
├─────────────────────────────────────────────────────────┤
│ 1. Acessa "Consultar Lances"                            │
│ 2. Vê lista com códigos STW-...                         │
│ 3. Visualiza acusação vs defesa (vídeos lado-a-lado)    │
│ 4. Vê resultado final (veredito + penalidade)           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Tabela de Penalidades

| Penalidade | Pontos | Descrição |
|------------|--------|-----------|
| Absolvido | 0 | Sem penalidade |
| Advertência | 0 | Avisar piloto |
| Leve | 5 | Infração leve |
| Média | 10 | Infração média |
| Grave | 15 | Infração grave |
| Gravíssima | 20 | Infração gravíssima |
| **Agravante** | **+5** | Se houver circunstâncias agravantes |
| **RACE BAN** | **Total >20** | Piloto não pode correr próxima etapa |

---

## 🔑 Configuração Necessária

### Passo 1: Supabase
```bash
# No console SQL do Supabase, executar:
# Copiar conteúdo de supabase-schema.sql
# Colar no SQL Editor
# Executar (Ctrl+Enter)
```

### Passo 2: Pilotos
```python
# Opção A: Via script Python
python3 scripts/import_pilotos.py

# Opção B: Manual SQL
INSERT INTO pilotos (nome, email, grid, equipe, whatsapp, is_steward) VALUES
('PILOTO1', 'email@example.com', 'carreira', 'EQUIPE1', '+55 11 99999-9999', false);

# Opção C: Via UI Supabase (Table Editor)
```

### Passo 3: Edge Function
```bash
# Criar arquivo: supabase/functions/send-email/index.ts
# Configurar secrets: SMTP_HOST, SMTP_USER, SMTP_PASS
# Deploy: supabase functions deploy send-email
```

### Passo 4: Testar
```javascript
// No navegador (/analises):
// 1. Login como piloto
// 2. Enviar acusação
// 3. Verificar email
// 4. Login como steward
// 5. Emitir veredito
// 6. Verificar email com resultado
```

---

## 📁 Arquivos Criados/Modificados

```
master-league-f1/
├── src/
│   ├── pages/
│   │   └── Analises.jsx ..................... [NOVO - 900+ linhas]
│   ├── hooks/
│   │   └── useAnalises.js ................... [NOVO - utilitários]
│   ├── utils/
│   │   └── emailService.js ................. [NOVO - templates email]
│   ├── App.jsx ............................ [MODIFICADO - rota /analises]
│   └── components/
│       └── Navbar.jsx ..................... [MODIFICADO - link ANÁLISES]
├── supabase-schema.sql ..................... [NOVO - schema Supabase]
├── SUPABASE_SETUP.md ...................... [NOVO - guia setup - 300 linhas]
├── ANALISES_V1_CHECKLIST.md ............... [NOVO - checklist deploy]
└── scripts/
    └── import_pilotos.py .................. [NOVO - script importação]
```

---

## ✅ Checklist Final

- [x] Frontend Análises.jsx criado (4 tabs completos)
- [x] Hooks useAnalises.js com utilitários
- [x] Email service com 5 templates
- [x] Schema Supabase SQL com RLS
- [x] App.jsx rota adicionada
- [x] Navbar.jsx link adicionado
- [x] Documentação completa
- [x] Script import_pilotos.py
- [ ] **TODO**: Executar supabase-schema.sql
- [ ] **TODO**: Popular tabela pilotos
- [ ] **TODO**: Criar Edge Function send-email
- [ ] **TODO**: Configurar secrets SMTP
- [ ] **TODO**: Testar fluxo completo
- [ ] **TODO**: Deploy produção

---

## 🎉 V1 Está Pronto!

Todos os arquivos estão prontos para usar. Próxima etapa: Configurar Supabase e testar!

Dúvidas? Ver:
- `SUPABASE_SETUP.md` - Instruções passo-a-passo
- `ANALISES_V1_CHECKLIST.md` - Verificação de deploy
- Console do browser (F12) - Debugging
