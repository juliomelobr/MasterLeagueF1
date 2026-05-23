# 📰 Guia Completo: Configurar Notícias com Supabase Storage

**Objetivo:** Subir imagens das notícias pelo Admin e elas aparecerem no site **sem deploy no Netlify** e **sem copiar link do Google Drive**.

---

## 📋 O que você vai configurar

- ✅ **Bucket (Storage)**: `noticias` - onde as imagens ficam armazenadas
- ✅ **Tabela (Database)**: `news_images` - guarda o timestamp para quebrar cache
- ✅ **Políticas (RLS)**: Permissões para o site ler e o Admin escrever

---

## 🚀 PASSO 1: Criar o Bucket `noticias`

### 1.1. Acessar o Supabase Dashboard

1. Abra seu navegador e acesse: **https://app.supabase.com**
2. Faça login na sua conta
3. Selecione seu projeto (Master League F1)

### 1.2. Criar o Bucket

1. No menu lateral esquerdo, clique em **"Storage"** (ícone de pasta 📁)
2. Clique no botão **"+ New bucket"** (canto superior direito)
3. Preencha:
   - **Name**: `noticias` (exatamente assim, minúsculo)
   - **Public bucket**: ✅ **Marque esta opção** (importante para o site exibir as imagens)
4. Clique em **"Create bucket"**

✅ **Pronto!** O bucket `noticias` foi criado.

---

## 🗄️ PASSO 2: Criar a Tabela `news_images`

### 2.1. Acessar o SQL Editor

1. No menu lateral, clique em **"SQL Editor"** (ícone de código `</>`)
2. Clique em **"+ New query"** (canto superior direito)

### 2.2. Executar o Script SQL

**Opção A: Usar o arquivo pronto (RECOMENDADO)**

1. Abra o arquivo `setup-noticias-supabase.sql` no seu projeto
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Cole** no SQL Editor do Supabase (Ctrl+V)
4. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

**Opção B: Copiar e colar manualmente**

Cole este código no SQL Editor:

```sql
-- Criar tabela news_images
CREATE TABLE IF NOT EXISTS public.news_images (
  slot INTEGER PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.news_images ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir leitura pública
CREATE POLICY "public can read news_images"
ON public.news_images
FOR SELECT
TO anon
USING (true);

-- Policy: Permitir inserção/atualização (para o Admin fazer upload)
CREATE POLICY "public can upsert news_images"
ON public.news_images
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
```

5. Clique em **"Run"** (ou `Ctrl+Enter`)

### 2.3. Verificar se a tabela foi criada

1. No menu lateral, clique em **"Table Editor"**
2. Procure pela tabela `news_images` na lista
3. Se aparecer, está tudo certo! ✅

---

## 🔐 PASSO 3: Configurar Políticas do Storage (Bucket)

### 3.1. Acessar as Políticas do Bucket

1. Vá em **Storage** → **Policies** (ou clique no bucket `noticias` → **"Policies"`)

### 3.2. Criar Policy de Leitura (para o site exibir)

1. Clique em **"+ New Policy"**
2. Selecione **"For full customization"**
3. Nome da policy: `Public read access`
4. **Allowed operation**: Selecione **"SELECT"** (leitura)
5. **Target roles**: Selecione **"anon"** e **"authenticated"**
6. **USING expression**: Cole: `true`
7. Clique em **"Review"** e depois **"Save policy"**

### 3.3. Criar Policy de Escrita (para o Admin fazer upload)

1. Clique novamente em **"+ New Policy"**
2. Selecione **"For full customization"**
3. Nome da policy: `Public upload access`
4. **Allowed operation**: Selecione **"INSERT"** e **"UPDATE"**
5. **Target roles**: Selecione **"anon"** e **"authenticated"**
6. **USING expression**: Cole: `true`
7. **WITH CHECK expression**: Cole: `true`
8. Clique em **"Review"** e depois **"Save policy"`

> ⚠️ **Nota de Segurança:** Permitir `anon` fazer upload significa que qualquer pessoa com a anon key pode tentar sobrescrever imagens. Para produção, considere usar Supabase Auth (só admin autenticado) ou Edge Function.

---

## ✅ PASSO 4: Verificar se está tudo funcionando

### 4.1. Verificar o Bucket

1. Vá em **Storage** → **Buckets**
2. Você deve ver o bucket `noticias` listado
3. Clique nele e verifique se está marcado como **"Public"**

### 4.2. Verificar a Tabela

1. Vá em **Table Editor** → `news_images`
2. A tabela deve estar vazia (isso é normal, ela será preenchida quando você fizer o primeiro upload)

### 4.3. Testar no Site

1. Acesse seu site → **Admin** → **NOTÍCIAS**
2. Escolha um ID (ex: `1`)
3. Selecione uma imagem e clique em **"Enviar Imagem"**
4. Se aparecer a mensagem de sucesso, está funcionando! ✅

---

## 📝 PASSO 5: Como usar no dia a dia

### 5.1. Fazer Upload de Imagem

1. Acesse **Admin** → **NOTÍCIAS**
2. No campo **"ID da Notícia"**, digite o número (1, 2, 3, etc.)
3. Clique em **"Selecionar Imagem"** e escolha o arquivo
4. Clique em **"Enviar Imagem"**
5. Aguarde a mensagem de sucesso: **"✅ Imagem enviada com sucesso!"**

### 5.2. Ver a Imagem no Site

1. Recarregue a página inicial do site (F5)
2. A imagem deve aparecer automaticamente no feed de notícias
3. **Não precisa fazer deploy no Netlify!** 🎉

---

## 🔧 Troubleshooting (Solução de Problemas)

### ❌ Erro: "Bucket not found"

**Solução:** Verifique se o bucket foi criado com o nome exato `noticias` (minúsculo, sem espaços).

### ❌ Erro: "Permission denied" ao fazer upload

**Solução:** Verifique se as policies do Storage estão configuradas corretamente (Passo 3).

### ❌ Erro: "Table news_images does not exist"

**Solução:** Execute novamente o script SQL do Passo 2.

### ❌ Imagem não aparece no site

**Soluções:**
1. Verifique se o bucket está marcado como **Public**
2. Verifique se a policy de leitura está ativa
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Verifique o console do navegador (F12) para erros

### ❌ Imagem aparece, mas não atualiza quando troco

**Solução:** O código usa `updated_at` para quebrar cache. Se ainda não atualizar, limpe o cache do navegador.

---

## 💡 Dicas Importantes

1. **Compatibilidade com Google Sheets:** Você pode continuar usando o Google Sheets para o texto das notícias. Deixe a coluna `image` vazia e use apenas o upload via Admin (Supabase).

2. **Nomes dos arquivos:** O sistema usa nomes fixos (`noticia1`, `noticia2`, etc.). Quando você faz upload de uma nova imagem para o mesmo ID, ela **substitui** a anterior automaticamente.

3. **Formatos suportados:** JPG, PNG, WebP (qualquer formato de imagem que o navegador suporta).

4. **Tamanho recomendado:** Imagens muito grandes podem demorar para carregar. Recomendo redimensionar para no máximo 1920x1080px antes de fazer upload.

---

## 🎉 Pronto!

Agora você pode atualizar as imagens das notícias **sem precisar fazer deploy no Netlify** e **sem copiar links do Google Drive**!

Qualquer dúvida, consulte este guia novamente ou verifique o console do navegador (F12) para mensagens de erro.


