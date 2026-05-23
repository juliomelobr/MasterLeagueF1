# 🚀 Deploy no Netlify - Guia Rápido

## ✅ Status Atual
- ✅ `netlify.toml` configurado
- ✅ `_redirects` configurado para SPA
- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`

## 🎯 Opção 1: Deploy via Interface Web (Recomendado)

### Passo 1: Preparar o Código
```bash
# Certifique-se de que tudo está commitado
git add .
git commit -m "Preparar para deploy no Netlify"
git push origin main
```

### Passo 2: Conectar ao Netlify
1. Acesse: https://app.netlify.com
2. Faça login (ou crie conta gratuita)
3. Clique em **"Add new site"** → **"Import an existing project"**
4. Escolha seu provedor Git (GitHub/GitLab/Bitbucket)
5. Autorize o Netlify
6. Selecione o repositório: `master-league-f1`

### Passo 3: Configurar Build
O Netlify deve detectar automaticamente:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Branch:** `main` (ou sua branch principal)

Se não detectar, configure manualmente:
- Build command: `npm run build`
- Publish directory: `dist`

### Passo 4: Deploy
1. Clique em **"Deploy site"**
2. Aguarde o build (2-5 minutos)
3. Seu site estará disponível em: `https://seu-site.netlify.app`

## 🎯 Opção 2: Deploy via Netlify CLI (Mais Rápido)

### Instalar Netlify CLI
```bash
npm install -g netlify-cli
```

### Fazer Login
```bash
netlify login
```

### Deploy
```bash
# Build do projeto
npm run build

# Deploy
netlify deploy --prod
```

## 🔧 Configurações Adicionais

### Variáveis de Ambiente (se necessário)
Se precisar adicionar variáveis de ambiente:
1. No painel do Netlify: **Site settings** → **Environment variables**
2. Adicione variáveis que começam com `VITE_` (se usar)

**Nota:** Atualmente o projeto usa credenciais hardcoded no `supabaseClient.js`, então não precisa configurar variáveis de ambiente.

### Personalizar Nome do Site
1. No painel: **Site settings** → **Change site name**
2. Escolha um nome único (ex: `master-league-f1`)

### Configurar Domínio Personalizado (Opcional)
1. No painel: **Domain settings** → **Add custom domain**
2. Siga as instruções para configurar DNS

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:
- ✅ Site carrega corretamente
- ✅ Rotas funcionam (não dá 404)
- ✅ Login funciona
- ✅ Conexão com Supabase funciona

## 🔄 Atualizações Futuras

Para atualizar o site:
```bash
git add .
git commit -m "Descrição das alterações"
git push origin main
```

O Netlify fará deploy automático! 🎉

## 🐛 Troubleshooting

### Build falha
- Verifique os logs no Netlify
- Certifique-se de que `node_modules` está no `.gitignore`
- Verifique se todas as dependências estão no `package.json`

### Erro 404 em rotas
- O arquivo `netlify.toml` já está configurado
- Verifique se o arquivo `_redirects` está na pasta `public/`

### Site não atualiza
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se o build foi concluído com sucesso

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs de build no Netlify
2. Consulte: https://docs.netlify.com/
