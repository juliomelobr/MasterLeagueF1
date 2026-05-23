# ✅ Checklist: Setup Notícias com Supabase Storage

Use este checklist para garantir que tudo está configurado corretamente.

---

## 📦 PASSO 1: Criar Bucket `noticias`

- [ ] Acessei o Supabase Dashboard (https://app.supabase.com)
- [ ] Fiz login e selecionei o projeto correto
- [ ] Cliquei em **Storage** no menu lateral
- [ ] Cliquei em **"+ New bucket"**
- [ ] Digitei o nome: `noticias` (minúsculo, sem espaços)
- [ ] Marquei a opção **"Public bucket"** ✅
- [ ] Cliquei em **"Create bucket"**
- [ ] O bucket `noticias` aparece na lista de buckets

---

## 🗄️ PASSO 2: Criar Tabela `news_images`

- [ ] Cliquei em **SQL Editor** no menu lateral
- [ ] Cliquei em **"+ New query"**
- [ ] Abri o arquivo `setup-noticias-supabase.sql` do projeto
- [ ] Copiei TODO o conteúdo (Ctrl+A, Ctrl+C)
- [ ] Colei no SQL Editor (Ctrl+V)
- [ ] Cliquei em **"Run"** (ou pressionei Ctrl+Enter)
- [ ] Apareceu a mensagem de sucesso: "Success. No rows returned"
- [ ] Fui em **Table Editor** e verifiquei que a tabela `news_images` existe

---

## 🔐 PASSO 3: Configurar Políticas do Storage

### 3.1. Policy de Leitura (SELECT)

- [ ] Fui em **Storage** → **Policies** (ou cliquei no bucket `noticias` → **"Policies"`)
- [ ] Cliquei em **"+ New Policy"**
- [ ] Selecionei **"For full customization"**
- [ ] Nome: `Public read access`
- [ ] **Allowed operation**: Selecionei **"SELECT"**
- [ ] **Target roles**: Selecionei **"anon"** e **"authenticated"**
- [ ] **USING expression**: Colei `true`
- [ ] Cliquei em **"Review"** e depois **"Save policy"**

### 3.2. Policy de Escrita (INSERT/UPDATE)

- [ ] Cliquei novamente em **"+ New Policy"**
- [ ] Selecionei **"For full customization"**
- [ ] Nome: `Public upload access`
- [ ] **Allowed operation**: Selecionei **"INSERT"** e **"UPDATE"**
- [ ] **Target roles**: Selecionei **"anon"** e **"authenticated"**
- [ ] **USING expression**: Colei `true`
- [ ] **WITH CHECK expression**: Colei `true`
- [ ] Cliquei em **"Review"** e depois **"Save policy"**

---

## ✅ PASSO 4: Verificação Final

- [ ] Bucket `noticias` está criado e marcado como **Public**
- [ ] Tabela `news_images` existe no Table Editor
- [ ] Policies do Storage estão criadas (2 policies: leitura e escrita)
- [ ] Acessei o site → **Admin** → **NOTÍCIAS**
- [ ] Testei fazer upload de uma imagem (ID: 1)
- [ ] Apareceu a mensagem: **"✅ Imagem enviada com sucesso!"**
- [ ] Recarreguei a página inicial do site (F5)
- [ ] A imagem apareceu no feed de notícias

---

## 🎉 Tudo Pronto!

Se todos os itens acima estão marcados, sua configuração está completa!

Agora você pode:
- ✅ Fazer upload de imagens pelo Admin
- ✅ Ver as imagens aparecerem no site sem precisar fazer deploy
- ✅ Substituir imagens antigas apenas fazendo upload novamente

---

## ❓ Problemas?

Se algo não funcionou, consulte o arquivo **`GUIA_NOTICIAS_SUPABASE_STORAGE.md`** na seção **"Troubleshooting"**.























