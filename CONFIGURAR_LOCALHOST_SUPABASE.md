# 🔧 Configurar Localhost no Supabase para Login

## Problema
Ao tentar fazer login no localhost, o sistema está redirecionando para o site publicado (produção) ao invés de manter no localhost.

## Solução

### 1. Configurar URLs de Redirecionamento no Supabase

1. Acesse o painel do Supabase:
   - URL: https://supabase.com/dashboard/project/ueqfmjwdijaeawvxhdtp/auth/url-configuration

2. Na seção **"Redirect URLs"**, adicione as seguintes URLs:

```
http://localhost:5173/login
http://localhost:5173/login-jurado
http://127.0.0.1:5173/login
http://127.0.0.1:5173/login-jurado
```

**Importante:** Se você estiver usando uma porta diferente (não 5173), adicione também:
```
http://localhost:PORTA/login
http://localhost:PORTA/login-jurado
```

3. Clique em **"Save"** para salvar as alterações.

### 2. Verificar Site URL

Na mesma página, verifique se a **"Site URL"** está configurada corretamente:
- Para desenvolvimento: `http://localhost:5173` (ou a porta que você usa)
- Para produção: URL do seu site publicado

### 3. Verificar Provider Settings (Google OAuth)

1. Vá para: https://supabase.com/dashboard/project/ueqfmjwdijaeawvxhdtp/auth/providers
2. Clique em **"Google"**
3. Verifique se as URLs de redirecionamento autorizadas incluem:
   - `http://localhost:5173/**`
   - `http://127.0.0.1:5173/**`

### 4. Testar

1. Abra o console do navegador (F12)
2. Tente fazer login
3. Verifique os logs que começam com:
   - `🌐 Ambiente detectado:`
   - `🔄 Redirect URL (Google):`
   - `🔄 Detectado retorno de OAuth na página /login`

4. Confirme que:
   - A URL de redirecionamento mostra `http://localhost:5173/login` (ou sua porta)
   - O ambiente detectado mostra `isLocalhost: true`
   - O retorno do OAuth acontece no localhost, não na produção

### 5. Se ainda não funcionar

Se após configurar tudo acima o problema persistir:

1. **Limpar cache do navegador:**
   - Pressione `Ctrl + Shift + Delete`
   - Selecione "Cookies e outros dados do site"
   - Limpe os dados do localhost

2. **Verificar se o Supabase está respeitando a URL:**
   - No console, verifique se a URL de redirecionamento está correta
   - Se estiver indo para produção, o problema está na configuração do Supabase

3. **Verificar variáveis de ambiente:**
   - Certifique-se de que não há variáveis de ambiente forçando produção

## Código Atual

O código já está configurado para detectar localhost automaticamente:

```javascript
// Detectar ambiente: localhost = dev, outro = produção
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const redirectUrl = isLocalhost 
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/login`
    : `${window.location.origin}/login`;
```

Isso garante que:
- No localhost: usa a porta atual (ex: `http://localhost:5173/login`)
- Em produção: usa a URL do site publicado

## Logs de Debug

O código agora inclui logs detalhados para ajudar a identificar o problema:

- `🌐 Ambiente detectado:` - Mostra informações do ambiente atual
- `🔄 Redirect URL (Google):` - Mostra a URL de redirecionamento configurada
- `🔄 Detectado retorno de OAuth:` - Mostra quando o OAuth retorna
- `⚠️ ATENÇÃO:` - Alerta se detectar problemas

Verifique esses logs no console do navegador para identificar onde está o problema.




















