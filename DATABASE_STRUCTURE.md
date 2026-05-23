# 📐 ESTRUTURA DE DADOS - ANÁLISES V1

## Diagrama ER (Entity-Relationship)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PILOTOS                                 │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) - PRIMARY KEY                                         │
│ nome (VARCHAR) - UNIQUE                                         │
│ email (VARCHAR) - UNIQUE                                        │
│ grid (VARCHAR) - 'carreira' ou 'light'                          │
│ equipe (VARCHAR)                                                │
│ whatsapp (VARCHAR)                                              │
│ is_steward (BOOLEAN) - Acesso ao painel                         │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
         ↑                                ↑
         │─── piloto_acusador_id         │─── piloto_acusado_id
         │                               │
         │─── steward_id                 │
         │
         └─ Relacionamentos (LANCES, ACUSACOES, DEFESAS, VERDICTS)

┌─────────────────────────────────────────────────────────────────┐
│                         LANCES                                  │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) - PRIMARY KEY                                         │
│ codigo (VARCHAR) - UNIQUE - Ex: STW-C190301                     │
│   └─ Formato: STW-{Grid: C|L}{Season: 2 dig}{Round: 2 dig}{Order: 2 dig}
│ season (INTEGER) - Ex: 19                                       │
│ round (INTEGER) - Ex: 3                                         │
│ grid (VARCHAR) - 'carreira' ou 'light'                          │
│ order_number (INTEGER) - Para gerar código (1, 2, 3...)         │
│ status (VARCHAR) - 'aberto' | 'em_analise' | 'fechado'          │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
         ↓
         └─ 1:N → ACUSACOES
         └─ 1:N → VERDICTS

┌─────────────────────────────────────────────────────────────────┐
│                      ACUSACOES                                  │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) - PRIMARY KEY                                         │
│ lance_id (UUID) - FOREIGN KEY → LANCES.id                       │
│ piloto_acusador_id (UUID) - FK → PILOTOS.id                     │
│ piloto_acusado_id (UUID) - FK → PILOTOS.id                      │
│ descricao (TEXT) - Descrição do lance/infração                  │
│ video_link (VARCHAR) - Link YouTube/Streamable                  │
│ status (VARCHAR) - 'pendente' | 'recebida' | 'contestada'       │
│ deadline_brt (TIMESTAMP) - Null se Carreira, Data+20:00 se Light│
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
         ↓
         └─ 1:N → DEFESAS
         └─ 1:1 → VERDICTS (via LANCES)

┌─────────────────────────────────────────────────────────────────┐
│                       DEFESAS                                   │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) - PRIMARY KEY                                         │
│ acusacao_id (UUID) - FOREIGN KEY → ACUSACOES.id                 │
│ piloto_acusado_id (UUID) - FK → PILOTOS.id                      │
│ descricao (TEXT) - Argumento de defesa                          │
│ video_link (VARCHAR) - Link YouTube/Streamable                  │
│ status (VARCHAR) - 'enviada' | 'recebida'                       │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      VERDICTS                                   │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) - PRIMARY KEY                                         │
│ lance_id (UUID) - FOREIGN KEY → LANCES.id                       │
│ resultado (VARCHAR) - 'absolvido' | 'culpado'                   │
│ penalty_type (VARCHAR) - 'advertencia' | 'leve' | 'media'       │
│                        | 'grave' | 'gravissima' | null          │
│ agravante (BOOLEAN) - Se há circunstâncias agravantes            │
│ pontos_deducted (INTEGER) - Pontos finais descontados (0-25)     │
│ race_ban (BOOLEAN) - true se pontos > 20 (piloto não corre!)    │
│ explanation (TEXT) - Explicação do veredito                     │
│ steward_id (UUID) - FK → PILOTOS.id (qual steward emitiu)       │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      EMAIL_LOG                                  │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) - PRIMARY KEY                                         │
│ destinatario (VARCHAR) - Email de destino                       │
│ assunto (VARCHAR) - Subject do email                            │
│ tipo (VARCHAR) - 'acusacao' | 'defesa' | 'veredito' etc        │
│ referencia_id (UUID) - ID do lance/acusacao/veredito             │
│ status (VARCHAR) - 'pendente' | 'enviado' | 'falha'             │
│ tentativas (INTEGER) - Quantas vezes tentou enviar              │
│ erro (TEXT) - Mensagem de erro (se houver)                      │
│ created_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Relacionamentos

```
1. PILOTO envia ACUSAÇÃO contra PILOTO
   PILOTOS ──1:N─ ACUSACOES ──1:1─ LANCES ──1:1─ VERDICTS

2. PILOTO responde com DEFESA
   PILOTOS ──1:N─ DEFESAS ──N:1─ ACUSACOES

3. STEWARD emite VEREDITO
   PILOTOS (steward) ──1:N─ VERDICTS

4. EMAILS são registrados
   EMAIL_LOG ◄── (triggers após acusação/defesa/veredito)
```

---

## 📊 Exemplos de Dados

### PILOTOS
```json
{
  "id": "uuid-1",
  "nome": "ALAIN PROST",
  "email": "alain@example.com",
  "grid": "carreira",
  "equipe": "McLAREN",
  "whatsapp": "+55 11 98765-4321",
  "is_steward": false,
  "created_at": "2025-01-15T10:00:00Z"
}
```

### LANCES
```json
{
  "id": "uuid-101",
  "codigo": "STW-C190301",
  "season": 19,
  "round": 3,
  "grid": "carreira",
  "order_number": 1,
  "status": "fechado",
  "created_at": "2025-01-20T14:30:00Z"
}
```

### ACUSACOES
```json
{
  "id": "uuid-201",
  "lance_id": "uuid-101",
  "piloto_acusador_id": "uuid-1",
  "piloto_acusado_id": "uuid-2",
  "descricao": "Colisão intencional na curva 1, FIA precisa revisar",
  "video_link": "https://www.youtube.com/watch?v=abc123",
  "status": "contestada",
  "deadline_brt": null,
  "created_at": "2025-01-20T14:35:00Z"
}
```

### DEFESAS
```json
{
  "id": "uuid-301",
  "acusacao_id": "uuid-201",
  "piloto_acusado_id": "uuid-2",
  "descricao": "Não houve colisão intencional. Piloto A fechou a linha bruscamente.",
  "video_link": "https://www.youtube.com/watch?v=def456",
  "status": "recebida",
  "created_at": "2025-01-20T15:00:00Z"
}
```

### VERDICTS
```json
{
  "id": "uuid-401",
  "lance_id": "uuid-101",
  "resultado": "culpado",
  "penalty_type": "grave",
  "agravante": true,
  "pontos_deducted": 20,
  "race_ban": false,
  "explanation": "Piloto A cometeu infração grave. Vídeo mostra que o piloto buscou contato. Agravante por histórico.",
  "steward_id": "uuid-steward-1",
  "created_at": "2025-01-21T10:00:00Z"
}
```

### EMAIL_LOG
```json
{
  "id": "uuid-501",
  "destinatario": "alain@example.com",
  "assunto": "[ML F1] Nova Acusação Registrada - STW-C190301",
  "tipo": "acusacao",
  "referencia_id": "uuid-201",
  "status": "enviado",
  "tentativas": 1,
  "erro": null,
  "created_at": "2025-01-20T14:35:30Z"
}
```

---

## 🔄 Fluxo de Dados - Passo a Passo

### 1. Piloto A envia Acusação
```
Frontend (Analises.jsx)
  ├─ Preenche form (Piloto B, Etapa 3, Descrição, Vídeo)
  ├─ Clica "Enviar Acusação"
  └─ Dispara handleSubmitAcusacao()
      ├─ Valida deadline (se Grid Light)
      ├─ Gera código: STW-C190301
      ├─ Insere em LANCES
      ├─ Busca IDs de Piloto A e Piloto B
      ├─ Insere em ACUSACOES
      ├─ Envia 3 emails (via emailService.js)
      │  ├─ Email 1: Piloto A (confirmação)
      │  ├─ Email 2: Piloto B (notificação)
      │  └─ Email 3: Stewards (admin alert)
      ├─ Insere 3 registros em EMAIL_LOG
      └─ Mostra confirmação modal
```

### 2. Piloto B envia Defesa
```
Frontend (Analises.jsx)
  ├─ Clica "Enviar Defesa"
  ├─ Dispara handleSubmitDefesa()
  │  ├─ Busca ACUSACOES pendentes contra Piloto B
  │  ├─ Insere em DEFESAS
  │  ├─ Atualiza ACUSACOES.status → "contestada"
  │  ├─ Envia 2 emails
  │  │  ├─ Email 1: Piloto B (confirmação)
  │  │  └─ Email 2: Piloto A (notificação)
  │  ├─ Insere 2 registros em EMAIL_LOG
  │  └─ Mostra confirmação modal
```

### 3. Steward emite Veredito
```
Frontend (Analises.jsx - Tab Stewards)
  ├─ Seleciona LANCES pendentes
  ├─ Vê ACUSACAO vs DEFESA (vídeos iframe lado-a-lado)
  ├─ Preenche Veredito (Resultado, Penalidade, Agravante, Explicação)
  ├─ Clica "Emitir Veredito"
  ├─ Dispara handleSubmitVeredicto()
  │  ├─ Calcula pontos: calculatePenaltyPoints(penalty, agravante)
  │  ├─ Calcula race_ban: (pontos > 20)
  │  ├─ Insere em VERDICTS
  │  ├─ Atualiza LANCES.status → "fechado"
  │  ├─ Envia 2 emails com resultado
  │  │  ├─ Email 1: Piloto A (resultado)
  │  │  └─ Email 2: Piloto B (resultado + penalidades)
  │  ├─ Insere 2 registros em EMAIL_LOG
  │  └─ Mostra confirmação com race_ban status
```

### 4. Qualquer Piloto consulta Lances
```
Frontend (Analises.jsx - Tab Consulta)
  ├─ Acessa /analises → Consultar Lances
  ├─ Carrega todos LANCES com status "fechado"
  ├─ Para cada LANCE:
  │  ├─ Busca ACUSACAO (com VIDEO)
  │  ├─ Busca DEFESA (com VIDEO)
  │  ├─ Busca VERDICTS (resultado + pontos)
  │  └─ Renderiza lado-a-lado (iframe YouTube)
  └─ Mostra lista com código, vídeos, resultado
```

---

## 🗄️ Índices (Performance)

```sql
CREATE INDEX idx_acusacoes_lance ON acusacoes(lance_id);
CREATE INDEX idx_acusacoes_acusador ON acusacoes(piloto_acusador_id);
CREATE INDEX idx_acusacoes_acusado ON acusacoes(piloto_acusado_id);
CREATE INDEX idx_defesas_acusacao ON defesas(acusacao_id);
CREATE INDEX idx_verdicts_lance ON verdicts(lance_id);
CREATE INDEX idx_email_log_tipo ON email_log(tipo);
CREATE INDEX idx_lances_season_round ON lances(season, round);
```

---

## 🔐 Row Level Security (RLS)

| Tabela | SELECT | INSERT | UPDATE | Regra |
|--------|--------|--------|--------|-------|
| pilotos | Público | Auth | Auth | Leitura pública |
| lances | Público | Auth | Steward | Criador + Steward |
| acusacoes | Própria + Steward | Auth | Steward | Acusador + Acusado + Steward |
| defesas | Própria + Steward | Auth | Steward | Defensor + Steward |
| verdicts | Steward | Steward | Steward | Apenas Steward |
| email_log | Steward | Sistema | Sistema | Apenas Steward |

---

## 📈 Escalabilidade

```
Queries/dia (estimado):
├─ SELECT lances: 100
├─ INSERT acusacoes: 10
├─ INSERT defesas: 5
├─ INSERT verdicts: 5
├─ SELECT email_log: 50
└─ Total: ~170 queries/dia (muito baixo - sem problemas)

Armazenamento:
├─ 1000 pilotos × 200 bytes = 200 KB
├─ 1000 lances × 300 bytes = 300 KB
├─ 5000 acusacoes × 500 bytes = 2.5 MB
├─ 5000 defesas × 400 bytes = 2 MB
├─ 5000 verdicts × 400 bytes = 2 MB
└─ Total: ~7 MB (muito baixo - sem problemas)
```

---

## 🎯 Conclusão

- ✅ Estrutura normalizada (3NF)
- ✅ Relacionamentos definidos
- ✅ Índices otimizados
- ✅ RLS policies seguras
- ✅ Email log para auditoria
- ✅ Escalável para 10K+ pilotos
