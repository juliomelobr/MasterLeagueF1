# 🔗 Configuração da URL do Ngrok

## ✅ URL Gerada

**URL do Ngrok:** `https://mckenna-metaleptic-daniele.ngrok-free.dev`

## 📝 Configuração no Supabase

### Passo 1: Acessar o Supabase
1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**

### Passo 2: Adicionar Redirect URLs

Adicione as seguintes URLs em **Redirect URLs**:

```
https://mckenna-metaleptic-daniele.ngrok-free.dev/login
https://mckenna-metaleptic-daniele.ngrok-free.dev/login-jurado
https://mckenna-metaleptic-daniele.ngrok-free.dev/dashboard
https://mckenna-metaleptic-daniele.ngrok-free.dev/dashboard/escolher-tipo
```

### Passo 3: Site URL (Opcional)

Você também pode adicionar como Site URL:
```
https://mckenna-metaleptic-daniele.ngrok-free.dev
```

### Passo 4: Salvar
Clique em **Save** para salvar as configurações.

## 🧪 Testar

### 1. Certifique-se que o servidor está rodando:
```bash
npm run dev
```

### 2. Acesse no celular:
Abra no navegador do celular:
```
https://mckenna-metaleptic-daniele.ngrok-free.dev
```

### 3. Teste o login:
- Tente fazer login com Google/Microsoft
- O redirecionamento deve funcionar corretamente agora!

## ⚠️ Importante

- **A URL do ngrok muda** se você reiniciar o ngrok (versão gratuita)
- Se reiniciar, atualize as URLs no Supabase
- Mantenha o ngrok rodando enquanto testar

## 🔄 Se a URL mudar

Se você reiniciar o ngrok e receber uma nova URL:
1. Copie a nova URL
2. Atualize no Supabase (Authentication → URL Configuration)
3. Use a nova URL no celular


















