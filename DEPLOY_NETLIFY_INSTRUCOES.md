# 🚀 Guia Completo - Deploy no Netlify

## 📋 Opção 1: Deploy via Interface Web (RECOMENDADO - Mais Fácil)

### Passo 1: Preparar o Código no Git

1. Certifique-se de que todas as alterações estão commitadas:
```bash
git add .
git commit -m "Preparar para deploy no Netlify"
git push origin main
```

### Passo 2: Criar Conta/Login no Netlify

1. Acesse: https://app.netlify.com
2. Faça login (ou crie uma conta gratuita)
3. Clique em **"Sign up"** se for novo usuário

### Passo 3: Conectar Repositório

1. No painel do Netlify, clique em **"Add new site"**
2. Selecione **"Import an existing project"**
3. Escolha seu provedor Git:
   - **GitHub** (se seu código está no GitHub)
   - **GitLab** (se está no GitLab)
   - **Bitbucket** (se está no Bitbucket)
4. Autorize o Netlify a acessar seus repositórios
5. Selecione o repositório: `master-league-f1`

### Passo 4: Configurar Build Settings

O Netlify deve detectar automaticamente as configurações do arquivo `netlify.toml`:

- ✅ **Build command:** `npm run build`
- ✅ **Publish directory:** `dist`
- ✅ **Branch to deploy:** `main` (ou sua branch principal)

**Se não detectar automaticamente, configure manualmente:**
- Build command: `npm run build`
- Publish directory: `dist`
- Branch: `main`

### Passo 5: Configurar Variáveis de Ambiente (OPCIONAL)

**Nota:** O projeto atualmente usa credenciais hardcoded no `supabaseClient.js`, então **NÃO é necessário** configurar variáveis de ambiente.

Se no futuro você quiser usar variáveis de ambiente:
1. No painel do site: **Site settings** → **Environment variables**
2. Adicione variáveis que começam com `VITE_` (ex: `VITE_SUPABASE_URL`)

### Passo 6: Fazer Deploy

1. Clique em **"Deploy site"**
2. Aguarde o build (2-5 minutos)
3. Seu site estará disponível em: `https://[nome-aleatorio].netlify.app`

### Passo 7: Personalizar Nome do Site (Opcional)

1. No painel: **Site settings** → **Change site name**
2. Escolha um nome único (ex: `master-league-f1`)
3. Seu site ficará: `https://master-league-f1.netlify.app`

---

## 📋 Opção 2: Deploy via Netlify CLI (Mais Rápido)

### Passo 1: Instalar Netlify CLI

**Windows (PowerShell):**
```powershell
npm install -g netlify-cli
```

**Mac/Linux:**
```bash
npm install -g netlify-cli
```

### Passo 2: Fazer Login

```bash
netlify login
```

Isso abrirá o navegador para você fazer login.

### Passo 3: Inicializar Site (Primeira Vez)

```bash
# No diretório do projeto
cd "D:\DEVCODE\PROJETOS\MLF1\master-league-f1"

# Inicializar site
netlify init
```

Siga as instruções:
- Escolha "Create & configure a new site"
- Escolha um nome para o site (ou deixe em branco para gerar automaticamente)
- Escolha seu time (ou crie um novo)

### Passo 4: Fazer Deploy

```bash
# Deploy de produção
netlify deploy --prod
```

**OU para fazer deploy de preview (teste):**
```bash
netlify deploy
```

---

## 📋 Opção 3: Deploy Manual (Arrastar e Soltar)

### Passo 1: Fazer Build Local

```bash
npm run build
```

### Passo 2: Arrastar Pasta `dist` para Netlify

1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta `dist` para a área indicada
3. Aguarde o upload e deploy

**⚠️ Nota:** Este método não permite deploy automático. Você precisará fazer isso manualmente a cada atualização.

---

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ Site carrega corretamente
2. ✅ Rotas funcionam (não dá 404 ao navegar)
3. ✅ Login funciona
4. ✅ Conexão com Supabase funciona
5. ✅ Imagens carregam corretamente

---

## 🔄 Atualizações Futuras

### Com Deploy Automático (Opção 1 ou 2):

Sempre que você fizer push para a branch `main`:
```bash
git add .
git commit -m "Descrição das alterações"
git push origin main
```

O Netlify fará deploy automático! 🎉

### Com Deploy Manual (Opção 3):

Repita o processo de build e arrastar a pasta `dist`.

---

## 🐛 Troubleshooting

### Build falha no Netlify

1. Verifique os logs de build no painel do Netlify
2. Certifique-se de que `node_modules` está no `.gitignore`
3. Verifique se todas as dependências estão no `package.json`
4. Verifique se a versão do Node.js está correta (Netlify usa Node 18 por padrão)

### Erro 404 em rotas

- O arquivo `netlify.toml` já está configurado com redirects
- Verifique se o arquivo `_redirects` está na pasta `public/` (opcional, o `netlify.toml` já cobre isso)

### Site não atualiza

1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se o build foi concluído com sucesso no painel
3. Aguarde alguns minutos para o CDN atualizar

### Erro de permissão no build local

Se você encontrar erros de permissão ao fazer build local:
- Feche todos os programas que possam estar usando arquivos da pasta `dist`
- Tente fazer o build diretamente no Netlify (Opção 1 ou 2)

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs de build no Netlify Dashboard
2. Consulte a documentação: https://docs.netlify.com/
3. Verifique o arquivo `netlify.toml` na raiz do projeto

---

## 📝 Configurações Atuais do Projeto

✅ **Arquivo `netlify.toml` configurado:**
- Build command: `npm run build`
- Publish directory: `dist`
- Redirects configurados para SPA (Single Page Application)

✅ **Arquivo `.gitignore` configurado:**
- `node_modules` ignorado
- `dist` ignorado
- Arquivos de ambiente ignorados

✅ **Build script configurado:**
- `npm run build` executa `vite build`

---

## 🎯 Próximos Passos Recomendados

1. **Fazer deploy inicial** usando a Opção 1 (Interface Web)
2. **Testar o site** após o deploy
3. **Configurar domínio personalizado** (opcional) no painel do Netlify
4. **Configurar notificações** de deploy (opcional) no painel

---

**Boa sorte com o deploy! 🚀**
