# 📱 Checklist - Teste de Login no Celular

## ✅ O que já está pronto:

- [x] Ngrok instalado e configurado
- [x] Authtoken configurado
- [x] Ngrok rodando na porta 5173
- [x] URL pública gerada: `https://mckenna-metaleptic-daniele.ngrok-free.dev`
- [x] Servidor Vite rodando na porta 5173
- [x] Código atualizado para usar URLs dinâmicas

## 📋 Próximos Passos:

### 1. Configurar no Supabase (SE AINDA NÃO FEZ)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**
4. Em **Redirect URLs**, adicione:
   ```
   https://mckenna-metaleptic-daniele.ngrok-free.dev/login
   https://mckenna-metaleptic-daniele.ngrok-free.dev/login-jurado
   https://mckenna-metaleptic-daniele.ngrok-free.dev/dashboard
   https://mckenna-metaleptic-daniele.ngrok-free.dev/dashboard/escolher-tipo
   ```
5. Clique em **Save**

### 2. Verificar se tudo está rodando

**Terminal 1 - Servidor Vite:**
```bash
npm run dev
```
Deve mostrar: `Local: http://localhost:5173/`

**Terminal 2 - Ngrok:**
```bash
npm run ngrok
```
Deve mostrar: `Forwarding https://mckenna-metaleptic-daniele.ngrok-free.dev -> http://localhost:5173`

### 3. Testar no Celular

1. **Abra o navegador no celular**
2. **Digite a URL:**
   ```
   https://mckenna-metaleptic-daniele.ngrok-free.dev
   ```
3. **Você deve ver a página inicial do site**

### 4. Testar o Login

1. **Clique em "Login" ou vá para:**
   ```
   https://mckenna-metaleptic-daniele.ngrok-free.dev/login
   ```
2. **Clique em "Entrar com Google" ou "Entrar com Microsoft"**
3. **Faça o login normalmente**
4. **Após autenticar, você deve ser redirecionado de volta para:**
   ```
   https://mckenna-metaleptic-daniele.ngrok-free.dev/login
   ```
5. **Continue o fluxo de validação WhatsApp**
6. **Após validar o código, deve redirecionar para:**
   ```
   https://mckenna-metaleptic-daniele.ngrok-free.dev/dashboard
   ```

## 🐛 Se algo não funcionar:

### Problema: "Página não encontrada"
- Verifique se o servidor Vite está rodando (`npm run dev`)
- Verifique se o ngrok está rodando (`npm run ngrok`)

### Problema: "Redirect URL não autorizada"
- Verifique se adicionou as URLs corretas no Supabase
- Certifique-se de que salvou as configurações

### Problema: "Erro ao fazer login"
- Abra o console do navegador no celular (Chrome DevTools via USB)
- Verifique os logs de erro
- Verifique se a URL de redirecionamento está correta nos logs

### Problema: Ngrok mostra página de aviso
- O ngrok gratuito mostra uma página de aviso na primeira vez
- Clique em "Visit Site" para continuar

## 📊 Verificar Logs

### No Dashboard do Ngrok:
Acesse: http://localhost:4040
- Veja todas as requisições em tempo real
- Verifique se as requisições estão chegando

### No Console do Navegador (Celular):
- Abra Chrome DevTools via USB
- Ou use Safari Web Inspector (iOS)
- Verifique os logs que adicionamos:
  - `🌐 Base URL detectada:`
  - `🔄 Redirect URL gerada:`
  - `📱 Device Detection:`

## ✅ Sucesso!

Se tudo funcionar, você deve conseguir:
- ✅ Acessar o site no celular via HTTPS
- ✅ Fazer login com Google/Microsoft
- ✅ Ser redirecionado corretamente após login
- ✅ Validar código WhatsApp
- ✅ Acessar o dashboard

## 🎉 Pronto para testar!

Siga os passos acima e me avise se funcionou ou se encontrou algum problema!


















