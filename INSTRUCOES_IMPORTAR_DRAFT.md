# 📥 Instruções para Criar Tabela e Importar Pilotos do Draft

## Passo 1: Criar a Tabela no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. **Copie TODO o conteúdo** do arquivo `supabase-schema-draft-pilotos.sql`
5. **Cole no editor SQL**
6. Clique em **Run** (ou pressione Ctrl+Enter)

⚠️ **IMPORTANTE**: Execute apenas o arquivo `supabase-schema-draft-pilotos.sql`
   - ❌ NÃO execute o arquivo `supabase/functions/sync-google-sheets/index.ts` (esse é TypeScript, não SQL)

## Passo 2: Verificar se a Tabela foi Criada

No SQL Editor, execute:

```sql
SELECT * FROM draft_pilotos LIMIT 5;
```

Se não houver erro, a tabela foi criada com sucesso! 🎉

## Passo 3: Importar os Dados das Planilhas

1. No seu projeto, acesse: **http://localhost:3000/admin/draft-import** (ou sua URL de desenvolvimento)
2. Faça login como admin/steward
3. Clique em **"🌐 Importar Ambos"** para importar Light e Carreira
4. Aguarde a importação terminar
5. Os dados serão salvos automaticamente no banco

## Arquivos Corretos:

✅ **SQL para executar**: `supabase-schema-draft-pilotos.sql`
❌ **NÃO executar**: `supabase/functions/sync-google-sheets/index.ts` (é TypeScript)

## Estrutura da Tabela:

- `id` - UUID (gerado automaticamente)
- `nome` - Nome do piloto (Coluna A)
- `grid` - 'light' ou 'carreira'
- `ordem_escolha` - Ordem de escolha (Coluna B)
- `power_ranking_pts` - Pontuação Power Ranking (Coluna E)
- `whatsapp` - Número do WhatsApp (Coluna K)
- `season` - Temporada (padrão: 20)
- `created_at` - Data de criação
- `updated_at` - Data de atualização










