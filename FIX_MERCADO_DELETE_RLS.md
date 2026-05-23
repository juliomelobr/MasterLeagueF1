# 🔧 Fix: Erro ao Resetar Mercado no Simulador

## ❌ Problema
Erro: `Falha ao resetar mercado` ou erro de permissão ao deletar contratos/interesses

Isso acontece porque as políticas RLS (Row Level Security) não permitem DELETE nas tabelas `interests` e `contracts`.

## ✅ Solução

### Passo 1: Executar Script SQL no Supabase

1. **Acesse o SQL Editor do Supabase:**
   - URL: https://app.supabase.com/project/[seu-project-id]/sql/new
   - Ou: Dashboard > SQL Editor > New Query

2. **Copie APENAS o conteúdo do arquivo SQL (NÃO o arquivo .md):**
   - Arquivo: `supabase-schema-mercado-t20-fix-delete-rls.sql`
   - ⚠️ **IMPORTANTE:** Copie apenas o conteúdo SQL, não este arquivo de instruções!

3. **Cole no SQL Editor do Supabase**

4. **Execute o script:**
   - Clique em **"Run"** (ou pressione `Ctrl+Enter`)

5. **Verifique se funcionou:**
   - Você deve ver uma mensagem de sucesso
   - A query de verificação no final deve mostrar 2 políticas criadas

### Passo 2: Verificar Políticas Criadas

No SQL Editor, execute esta query para verificar:

```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename IN ('interests', 'contracts') 
AND cmd = 'DELETE'
ORDER BY tablename;
```

Deve mostrar 2 políticas:
- `interests_delete_policy`
- `contracts_delete_policy`

### Passo 3: Testar Reset do Mercado

1. Volte para o painel admin: `/admin-mercado-draft`
2. Vá na aba **"Simulador"**
3. Clique em **"🗑️ Resetar Mercado"**
4. Confirme a ação

Agora deve funcionar! ✅

---

## 🔍 Troubleshooting

### Se ainda der erro após executar o script:

1. **Verifique se você está autenticado no Supabase:**
   - Faça login no painel admin primeiro
   - Certifique-se de que está usando a mesma sessão

2. **Verifique se copiou o arquivo correto:**
   - Use o arquivo: `supabase-schema-mercado-t20-fix-delete-rls.sql`
   - NÃO use arquivos `.md` (Markdown) - eles são apenas instruções!

3. **Limpe o cache do navegador:**
   - Pressione `Ctrl+Shift+R` para recarregar forçado
   - Ou feche e abra o navegador novamente

4. **Verifique as políticas RLS:**
   - No SQL Editor, execute:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('interests', 'contracts') AND cmd = 'DELETE';
   ```
   - Deve mostrar 2 políticas DELETE

---

## 📝 Nota

Este script adiciona políticas DELETE que permitem que o painel Admin possa resetar o mercado de draft, deletando todos os contratos e interesses da temporada 20.










