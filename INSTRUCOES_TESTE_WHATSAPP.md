# 📱 Instruções para Testar Envio de WhatsApp

## ⚠️ IMPORTANTE

Antes de testar, você **DEVE** fazer o deploy da Edge Function atualizada com os logs detalhados:

```bash
npx supabase functions deploy send-whatsapp-code
```

---

## 🔍 Verificações Pré-Teste

### 1. Verificar se o piloto existe no banco

O teste usa o email `juliomelobr@hotmail.com`. Certifique-se de que existe um registro na tabela `pilotos` com este email:

```sql
-- No Supabase SQL Editor
SELECT * FROM pilotos WHERE email = 'juliomelobr@hotmail.com';
```

Se não existir, você precisa:
- Inserir manualmente no Supabase, OU
- Executar a sincronização da planilha Google Sheets

---

### 2. Verificar Secrets do Z-API

No Supabase Dashboard → Edge Functions → Secrets, verifique se existem:

- ✅ `ZAPI_INSTANCE` - ID da instância
- ✅ `ZAPI_TOKEN` - Token da instância
- ⚠️ `ZAPI_CLIENT_TOKEN` - Opcional (só se estiver configurado no Z-API)

**IMPORTANTE:** Após adicionar/editar secrets, você precisa fazer redeploy da Edge Function para que sejam carregados.

---

## 🧪 Como Testar

### Opção 1: Script PowerShell (Recomendado)

```powershell
.\teste-whatsapp-terminal.ps1
```

### Opção 2: Script Batch (CMD)

Execute o arquivo `teste-whatsapp-curl.bat` (duplo clique ou via CMD)

### Opção 3: Manual via PowerShell

```powershell
$body = @{
    email = "juliomelobr@hotmail.com"
    whatsapp = "551983433940"
    nomePiloto = "Julio Melo"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI"
}

try {
    $response = Invoke-RestMethod -Uri "https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/send-whatsapp-code" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

---

## 📊 Analisando os Resultados

### ✅ Sucesso Esperado

```json
{
  "success": true,
  "message": "Código enviado com sucesso"
}
```

**O que fazer:**
1. Verifique seu WhatsApp (`551983433940`)
2. Você deve receber uma mensagem com o código de 6 dígitos
3. Verifique no banco se o código foi salvo:
   ```sql
   SELECT * FROM whatsapp_verification_codes 
   WHERE email = 'juliomelobr@hotmail.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

---

### ❌ Erro: "Piloto não encontrado"

**Causa:** O email `juliomelobr@hotmail.com` não existe na tabela `pilotos`

**Solução:**
1. Inserir piloto manualmente no Supabase:
   ```sql
   INSERT INTO pilotos (email, nome, whatsapp, grid, is_steward)
   VALUES ('juliomelobr@hotmail.com', 'Julio Melo', '551983433940', 'carreira', false);
   ```

2. Ou sincronizar da planilha Google Sheets

---

### ❌ Erro: "Z-API não configurado"

**Causa:** Secrets `ZAPI_INSTANCE` ou `ZAPI_TOKEN` não estão configurados

**Solução:**
1. Acesse Supabase Dashboard → Edge Functions → Secrets
2. Adicione `ZAPI_INSTANCE` com o valor correto
3. Adicione `ZAPI_TOKEN` com o valor correto
4. **IMPORTANTE:** Faça redeploy da Edge Function após adicionar secrets

---

### ❌ Erro: "Erro do Z-API"

**Causa:** Problema na comunicação com a API do Z-API

**Solução:**
1. Verificar logs da Edge Function no Supabase Dashboard:
   - Acesse: Supabase Dashboard → Edge Functions → `send-whatsapp-code` → Logs
   - Procure por linhas com `[Z-API]` para ver detalhes

2. Verificar credenciais no Z-API Dashboard:
   - Confirme que `ZAPI_INSTANCE` e `ZAPI_TOKEN` estão corretos
   - Verifique se a instância está "Conectada" no Z-API

3. Verificar número no Z-API:
   - Confirme que o número `551983433940` está cadastrado/verificado no Z-API

---

## 📝 Logs Detalhados

A Edge Function atualizada agora gera logs detalhados com prefixo `[Z-API]`:

- `🔍 [Z-API] Iniciando envio...` - Verificação de secrets
- `📱 [Z-API] Enviando via Z-API:` - Detalhes da requisição
- `📤 [Z-API] Request body:` - Corpo da requisição enviada
- `📥 [Z-API] Response status:` - Status HTTP da resposta
- `📥 [Z-API] Response body:` - Corpo da resposta (sucesso ou erro)
- `✅ [Z-API] Mensagem enviada com sucesso!` - Sucesso
- `❌ [Z-API] Erro ao enviar:` - Erro com detalhes

**Para ver os logs:**
1. Acesse Supabase Dashboard
2. Vá para: Edge Functions → `send-whatsapp-code`
3. Clique na aba "Logs"
4. Execute o teste novamente
5. Os logs aparecerão em tempo real

---

## 🔄 Próximos Passos Após Sucesso

Se o teste funcionar e você receber a mensagem no WhatsApp:

1. ✅ Verificar se o código foi salvo no banco
2. ✅ Implementar frontend 2FA no `Login.jsx`
3. ✅ Implementar validação de código no `Login.jsx`
4. ✅ Testar fluxo completo end-to-end

---

**Última atualização:** 13/12/2024




































