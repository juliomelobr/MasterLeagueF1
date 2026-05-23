# 🔧 Fix: Erro ao Criar Narrador

## ❌ Problema
Erro: `Could not find the table 'public.narradores' in the schema cache`

Isso significa que a tabela `narradores` não foi criada no banco de dados Supabase ainda.

## ✅ Solução

### Passo 1: Executar Script SQL no Supabase

1. **Acesse o SQL Editor do Supabase:**
   - URL: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new
   - Ou: Dashboard > SQL Editor > New Query

2. **Copie e cole o conteúdo do arquivo:**
   - Arquivo: `supabase-schema-narradores-fix.sql`
   - Ou use o arquivo original: `supabase-schema-narradores.sql`

3. **Execute o script:**
   - Clique em **"Run"** (ou pressione `Ctrl+Enter`)

4. **Verifique se funcionou:**
   - Você deve ver mensagens de sucesso
   - Vá em **Table Editor** e confirme que a tabela `narradores` existe

### Passo 2: Verificar Tabela Criada

No SQL Editor, execute esta query para verificar:

```sql
SELECT * FROM public.narradores;
```

Se não der erro, a tabela foi criada com sucesso! ✅

### Passo 3: Testar Criação de Narrador

1. Volte para o painel admin: `/admin`
2. Vá na aba **"NARRADORES"**
3. Clique em **"+ Novo Narrador"**
4. Preencha os dados e clique em **"Criar"**

Agora deve funcionar! ✅

---

## 🔍 Troubleshooting

### Se ainda der erro após executar o script:

1. **Verifique se você está autenticado no Supabase:**
   - Faça login no painel admin primeiro
   - Certifique-se de que está usando a mesma sessão

2. **Limpe o cache do navegador:**
   - Pressione `Ctrl+Shift+R` para recarregar forçado
   - Ou feche e abra o navegador novamente

3. **Verifique as políticas RLS:**
   - No SQL Editor, execute:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'narradores';
   ```
   - Deve mostrar 4 políticas (SELECT, INSERT, UPDATE, DELETE)

4. **Se as políticas estiverem muito restritivas:**
   - Execute o script `supabase-schema-narradores-fix.sql` que tem políticas mais permissivas temporariamente

---

## 📝 Nota

O arquivo `supabase-schema-narradores.sql` já existia no projeto, mas não havia sido executado no banco de dados. Após executar o script SQL, o problema será resolvido.

