# 🔐 Configuração do Ngrok - Autenticação

## ⚠️ Erro Encontrado

O ngrok agora requer uma conta verificada e authtoken para funcionar, mesmo na versão gratuita.

## 📝 Passo a Passo para Configurar

### Passo 1: Criar Conta no Ngrok

1. Acesse: https://dashboard.ngrok.com/signup
2. Crie uma conta gratuita (pode usar Google/GitHub)
3. Verifique seu email

### Passo 2: Obter o Authtoken

1. Após fazer login, acesse: https://dashboard.ngrok.com/get-started/your-authtoken
2. Você verá seu authtoken (algo como: `2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`)
3. **Copie esse token** (você precisará dele)

### Passo 3: Configurar o Authtoken no Terminal

Execute o comando abaixo no PowerShell, substituindo `SEU_AUTHTOKEN` pelo token que você copiou:

```powershell
ngrok config add-authtoken SEU_AUTHTOKEN
```

**Exemplo:**
```powershell
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### Passo 4: Verificar Configuração

Execute para verificar se está configurado:

```powershell
ngrok config check
```

Se aparecer "Valid", está tudo certo!

### Passo 5: Testar o Ngrok

Agora você pode executar:

```powershell
npm run ngrok
```

Ou:

```powershell
ngrok http 5173
```

## ✅ Pronto!

Após configurar o authtoken, o ngrok funcionará normalmente!

## 💡 Dica

O authtoken fica salvo no seu computador, então você só precisa fazer isso uma vez.


















