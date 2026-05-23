# 🔍 Diagnóstico: Vídeo não Incorporado no Lance STW-L2008

## 📋 Problema

O vídeo da acusação do lance **STW-L2008** não está sendo incorporado para visualização no site.

---

## 🔎 Como o Sistema Funciona

### 1. **Quando uma Acusação é Criada**

**Arquivo:** `src/pages/FormularioAcusacao.jsx`

Quando um piloto cria uma acusação:
1. O sistema gera o código do lance (ex: `STW-L2008`)
2. O link do vídeo é processado: `getVideoEmbedUrl(formData.videoLink)`
3. Os dados são salvos no objeto `dadosAcusacao`:
   ```javascript
   {
     codigoLance: "STW-L2008",
     videoLink: "https://youtube.com/watch?v=...",  // Link original
     videoEmbed: "https://www.youtube.com/embed/...", // Link de embed
     // ... outros campos
   }
   ```
4. A função `notifyAdminNewAccusation()` salva no banco:
   ```javascript
   await supabase
     .from('notificacoes_admin')
     .insert([{
       tipo: 'nova_acusacao',
       dados: dadosAcusacao,  // JSON completo com videoLink e videoEmbed
       // ...
     }])
   ```

### 2. **Como o Vídeo é Exibido**

**Arquivos:** 
- `src/pages/ConsultarAnalises.jsx` (linha 682)
- `src/pages/PainelVeredito.jsx` (linha 1546)
- `src/pages/Analises.jsx` (linha 1571)

O componente `VideoEmbed` recebe o `videoLink`:
```jsx
<VideoEmbed
  videoLink={dados.videoLink || dados.video_link}
  title="Vídeo da acusação"
  borderColor="#EF4444"
/>
```

**O componente `VideoEmbed`:**
1. Recebe o `videoLink`
2. Chama `getVideoEmbedUrl(videoLink)` para converter em embed
3. Se retornar `null` (formato não suportado), mostra link externo
4. Se retornar URL de embed, cria um `<iframe>` para exibir o vídeo

---

## 🐛 Possíveis Causas

### 1. **Campo `videoLink` está vazio/null no banco**

**Como verificar:**
```sql
SELECT 
    id,
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link,
    dados->>'videoEmbed' as video_embed
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';
```

**Solução:**
- Se `video_link` estiver `null` ou vazio, o vídeo não foi salvo corretamente
- Verificar se o link foi preenchido no formulário de acusação
- Pode ser necessário atualizar manualmente no banco

### 2. **Link não está em formato suportado**

**Formatos suportados:**
- ✅ YouTube: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`
- ✅ YouTube Clips: `youtube.com/clip/` (exibido como card especial com link)
- ✅ Vimeo: `vimeo.com/`
- ✅ Dailymotion: `dailymotion.com/video/`
- ✅ Streamable: `streamable.com/`
- ✅ Twitch: `twitch.tv/videos/`, `twitch.tv/clips/`
- ✅ Google Drive: `drive.google.com/file/d/`
- ✅ Steam CDN: `cdn.steamusercontent.com`
- ❌ Links diretos para arquivos MP4/MOV (não suportados para embed)

**Nota sobre YouTube Clips:**
- YouTube Clips **não podem ser embedados diretamente** como vídeos normais
- O sistema detecta automaticamente e exibe um **card especial** com botão para abrir no YouTube
- O link deve estar no formato: `https://www.youtube.com/clip/CLIP_ID` (sem parâmetros `?si=`)

**Como verificar:**
```sql
SELECT 
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';
```

**Solução:**
- Se o link não estiver em formato suportado, o `VideoEmbed` mostrará um link externo
- Converter o vídeo para uma plataforma suportada (YouTube, Vimeo, etc.)

### 3. **Campo está salvo com nome diferente**

**Verificar:**
```sql
SELECT 
    jsonb_pretty(dados) as dados_completos
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';
```

**Possíveis nomes:**
- `videoLink` ✅ (correto)
- `video_link` (snake_case - pode ser usado como fallback)
- `videoEmbed` (este é o embed, não o link original)

### 4. **Problema na renderização do componente**

**Verificar no console do navegador:**
1. Abrir DevTools (F12)
2. Ir para a página onde o vídeo deveria aparecer
3. Verificar se há erros no console
4. Verificar se `dados.videoLink` tem valor

---

## 🔧 Como Corrigir

### Opção 1: Atualizar Manualmente no Banco

Se o `videoLink` estiver vazio ou incorreto:

```sql
-- 1. Verificar o registro atual
SELECT id, dados->>'videoLink' as video_atual
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';

-- 2. Atualizar com o link correto
UPDATE notificacoes_admin
SET dados = jsonb_set(
    dados,
    '{videoLink}',
    '"https://youtube.com/watch?v=VIDEO_ID_AQUI"'
)
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';

-- 3. Atualizar também o videoEmbed
UPDATE notificacoes_admin
SET dados = jsonb_set(
    dados,
    '{videoEmbed}',
    '"https://www.youtube.com/embed/VIDEO_ID_AQUI"'
)
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';
```

### Opção 2: Verificar se o Link está em Formato Suportado

Teste o link manualmente:

```javascript
// No console do navegador
import { getVideoEmbedUrl } from './src/utils/videoEmbed';
const embedUrl = getVideoEmbedUrl('SEU_LINK_AQUI');
console.log('Embed URL:', embedUrl);
// Se retornar null, o formato não é suportado
```

### Opção 3: Adicionar Fallback no Código

Se o problema for que o campo não está sendo encontrado, adicionar mais fallbacks:

```jsx
// Em ConsultarAnalises.jsx, linha 682
<VideoEmbed
  videoLink={
    dados.videoLink || 
    dados.video_link || 
    dados.videoEmbed ||  // Usar embed se link não estiver disponível
    null
  }
  title={`Vídeo acusação ${codigoLance}`}
  borderColor="#EF4444"
/>
```

---

## 📊 Script de Diagnóstico Completo

Execute no **Supabase SQL Editor**:

```sql
-- Verificar todos os dados do lance STW-L2008
SELECT 
    id,
    tipo,
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link,
    dados->>'videoEmbed' as video_embed,
    dados->>'descricao' as descricao,
    dados->>'status' as status,
    CASE 
        WHEN dados->>'videoLink' IS NULL THEN '❌ videoLink está NULL'
        WHEN dados->>'videoLink' = '' THEN '❌ videoLink está vazio'
        ELSE '✅ videoLink existe'
    END as status_video,
    created_at,
    updated_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🎯 Próximos Passos

1. **Execute o script SQL acima** para verificar o estado atual do lance
2. **Verifique o console do navegador** quando acessar a página
3. **Teste o link do vídeo** com a função `getVideoEmbedUrl()`
4. **Se necessário, atualize manualmente** o campo no banco

---

## 📝 Notas

- O campo `videoEmbed` é calculado automaticamente quando a acusação é criada
- Se o link não for suportado, `videoEmbed` será `null`
- O componente `VideoEmbed` sempre tenta converter o `videoLink` novamente (não usa `videoEmbed` diretamente)
- Se o formato não for suportado, mostra um link externo em vez de embed
- **YouTube Clips**: São detectados automaticamente e exibidos como card especial (não podem ser embedados)

---

**Última Atualização:** 27/01/2026
