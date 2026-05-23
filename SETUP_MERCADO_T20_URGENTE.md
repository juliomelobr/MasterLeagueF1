# ⚠️ ERRO: Tabela 'interests' não encontrada - SOLUÇÃO RÁPIDA

## 🔴 Problema
O erro "Could not find the table 'public.interests' in the schema cache" ocorre porque as tabelas do mercado T20 ainda não foram criadas no Supabase.

## ✅ Solução: Executar o Schema SQL

### Passo 1: Acessar o Supabase
1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **SQL Editor** (menu lateral esquerdo)

### Passo 2: Executar o Script
1. Abra o arquivo `supabase-schema-mercado-t20.sql` no seu editor
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)

### Passo 3: Verificar se foi criado
Execute esta query para verificar:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('equipes', 'interests', 'contracts');
```

Você deve ver 3 tabelas listadas:
- equipes
- interests  
- contracts

### Passo 4: Popular draft_priority (Opcional mas Recomendado)
1. Abra o arquivo `mercado-t20-populate-draft-priority.sql`
2. **Ajuste os nomes dos pilotos** para os nomes reais do seu banco
3. **Ajuste as prioridades** baseado no Power Ranking T19 (inverso)
4. Execute o script no SQL Editor

## 📋 Checklist Rápido

- [ ] Executou `supabase-schema-mercado-t20.sql` no SQL Editor
- [ ] Verificou que as 3 tabelas foram criadas
- [ ] (Opcional) Populou `draft_priority` dos pilotos
- [ ] Recarregou a página do Escritório Draft
- [ ] Erro desapareceu

## 🎯 Após Executar

Depois de executar o schema, recarregue a página do Escritório Draft. O erro deve desaparecer e você poderá:
- Ver as equipes
- Manifestar interesse
- Receber propostas
- Assinar contratos

## ⚡ Comando Rápido

Se você tem acesso via CLI do Supabase:
```bash
supabase db reset --linked
# ou
psql <supabase-schema-mercado-t20.sql
```

Mas a forma mais fácil é pelo **SQL Editor** no painel web do Supabase!














