# 🚀 Guia de Deploy Automático no Netlify

Este guia vai te ajudar a configurar o deploy automático do site no Netlify, conectando ao seu repositório Git.

## 📋 Pré-requisitos

1. ✅ Conta no Netlify (gratuita): https://app.netlify.com/signup
2. ✅ Repositório Git (GitHub, GitLab ou Bitbucket)
3. ✅ Projeto já configurado com Git (já está ✅)

## 🔧 Passo a Passo

### 1. Fazer Push do Código para o Repositório

Primeiro, certifique-se de que todo o código está commitado e enviado para o repositório remoto:

```bash
# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Configuração para deploy automático no Netlify"

# Enviar para o repositório remoto
git push origin main
```

### 2. Conectar o Repositório ao Netlify

1. Acesse https://app.netlify.com
2. Faça login na sua conta
3. Clique em **"Add new site"** → **"Import an existing project"**
4. Escolha o provedor do seu repositório (GitHub, GitLab ou Bitbucket)
5. Autorize o Netlify a acessar seus repositórios
6. Selecione o repositório `master-league-f1`

### 3. Configurar o Build

O Netlify deve detectar automaticamente as configurações do arquivo `netlify.toml`, mas verifique:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Branch to deploy:** `main` (ou a branch principal do seu projeto)

### 4. Configurar Variáveis de Ambiente

Se o seu projeto usa variáveis de ambiente (como chaves do Supabase), você precisa configurá-las no Netlify:

1. No painel do site no Netlify, vá em **Site settings** → **Environment variables**
2. Adicione as variáveis necessárias:
   - `VITE_SUPABASE_URL` (se usar)
   - `VITE_SUPABASE_ANON_KEY` (se usar)
   - Qualquer outra variável que comece com `VITE_`

**⚠️ Importante:** No Vite, apenas variáveis que começam com `VITE_` são expostas ao cliente.

### 5. Deploy Automático

Agora, sempre que você fizer push para a branch `main` (ou a branch configurada), o Netlify vai:

1. ✅ Detectar automaticamente o novo commit
2. ✅ Executar `npm install` para instalar dependências
3. ✅ Executar `npm run build` para fazer o build
4. ✅ Publicar os arquivos da pasta `dist`
5. ✅ Atualizar o site automaticamente

### 6. Verificar o Deploy

Após o primeiro deploy:

1. O Netlify vai gerar uma URL temporária (ex: `random-name-123.netlify.app`)
2. Você pode personalizar o nome do site em **Site settings** → **Change site name**
3. Você pode configurar um domínio personalizado se quiser

## 🔄 Workflow de Atualização

Agora, para atualizar o site, basta:

```bash
# 1. Fazer suas alterações no código
# 2. Commit e push
git add .
git commit -m "Descrição das alterações"
git push origin main

# 3. O Netlify faz o resto automaticamente! 🎉
```

## 📊 Monitoramento

No painel do Netlify você pode:

- Ver o histórico de deploys
- Ver logs de build
- Reverter para uma versão anterior
- Ver estatísticas do site
- Configurar notificações por email

## 🛠️ Troubleshooting

### Build falha

1. Verifique os logs de build no Netlify
2. Certifique-se de que todas as dependências estão no `package.json`
3. Verifique se as variáveis de ambiente estão configuradas

### Site não atualiza

1. Verifique se o push foi feito para a branch correta
2. Verifique se o build foi concluído com sucesso
3. Limpe o cache do navegador (Ctrl+Shift+R)

### Erro 404 em rotas

O arquivo `netlify.toml` já está configurado com redirecionamentos para SPAs. Se ainda tiver problemas, verifique o arquivo `public/_redirects`.

## 📝 Notas Importantes

- ⚠️ **Nunca commite** arquivos com informações sensíveis (senhas, chaves privadas)
- ✅ Use variáveis de ambiente para informações sensíveis
- ✅ O arquivo `netlify.toml` já está configurado e pronto para uso
- ✅ O `.gitignore` já está configurado para ignorar `node_modules` e `dist`

## 🎉 Pronto!

Agora seu site está configurado para deploy automático. Toda vez que você fizer push, o site será atualizado automaticamente!

