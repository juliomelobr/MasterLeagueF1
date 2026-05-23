# 🚀 Guia de Uso do Ngrok

## O que é o Ngrok?

O Ngrok cria um túnel HTTPS público para seu servidor local, permitindo que você teste seu site no celular sem precisar configurar IPs locais ou lidar com problemas de CORS/HTTPS.

## ✅ Instalação

O ngrok já foi instalado globalmente. Para verificar:

```bash
ngrok version
```

## 🎯 Uso Básico

### 1. Iniciar o servidor de desenvolvimento

Em um terminal, inicie o Vite:

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:5173`

### 2. Iniciar o Ngrok

Em **outro terminal**, execute:

```bash
npm run ngrok
```

Ou diretamente:

```bash
ngrok http 5173
```

### 3. Obter a URL pública

O ngrok vai mostrar algo assim:

```
Forwarding   https://a1b2-c3d4-5678.ngrok-free.app -> http://localhost:5173
```

**Copie a URL HTTPS** (ex: `https://a1b2-c3d4-5678.ngrok-free.app`)

### 4. Usar no celular

Abra essa URL HTTPS no navegador do celular. Você terá acesso completo ao seu site local!

## ⚙️ Configuração no Supabase

### Passo 1: Obter a URL do Ngrok

Quando você executar `ngrok http 5173`, copie a URL HTTPS que aparece.

**Exemplo:** `https://a1b2-c3d4-5678.ngrok-free.app`

### Passo 2: Adicionar no Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**
4. Em **Redirect URLs**, adicione:
   - `https://a1b2-c3d4-5678.ngrok-free.app/login`
   - `https://a1b2-c3d4-5678.ngrok-free.app/login-jurado`
   - `https://a1b2-c3d4-5678.ngrok-free.app/dashboard`
5. Clique em **Save**

### Passo 3: Testar

Agora você pode:
- Acessar `https://a1b2-c3d4-5678.ngrok-free.app` no celular
- Fazer login normalmente
- O redirecionamento funcionará corretamente!

## 🔄 URLs Dinâmicas do Ngrok

**IMPORTANTE:** A URL do ngrok muda toda vez que você reinicia (na versão gratuita).

**Solução:** Sempre que reiniciar o ngrok:
1. Copie a nova URL
2. Atualize no Supabase (Redirect URLs)
3. Use a nova URL no celular

## 💡 Dicas

### Usar domínio fixo (Plano Pago)

Se você tiver plano pago do ngrok, pode usar um domínio fixo:

```bash
ngrok http 5173 --domain=seu-dominio.ngrok-free.app
```

E adicionar no `package.json`:

```json
"ngrok:dev": "ngrok http 5173 --domain=seu-dominio.ngrok-free.app"
```

### Verificar status

Para ver o dashboard do ngrok e monitorar requisições:

1. Quando executar `ngrok http 5173`, ele mostra:
   ```
   Web Interface  http://127.0.0.1:4040
   ```
2. Acesse `http://localhost:4040` no navegador
3. Veja todas as requisições em tempo real!

### Parar o Ngrok

Pressione `Ctrl+C` no terminal onde o ngrok está rodando.

## 🐛 Troubleshooting

### Erro: "ngrok: command not found"

Se o comando não for encontrado:

```bash
# Windows (PowerShell)
npm install -g ngrok

# Verificar instalação
where ngrok
```

### Erro: "Tunnel session failed"

- Verifique se a porta 5173 está correta
- Certifique-se de que o servidor Vite está rodando
- Tente reiniciar o ngrok

### Erro: "Too many connections"

Na versão gratuita há limite de conexões. Aguarde alguns minutos ou considere o plano pago.

## 📝 Checklist Rápido

- [ ] Servidor Vite rodando (`npm run dev`)
- [ ] Ngrok rodando (`npm run ngrok`)
- [ ] URL HTTPS copiada do ngrok
- [ ] URL adicionada no Supabase (Redirect URLs)
- [ ] Testando no celular com a URL HTTPS

## 🎉 Pronto!

Agora você pode testar o login no celular usando HTTPS sem problemas de configuração!


















