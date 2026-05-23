# 🔧 Corrigir Vídeo do Lance STW-L2008

## 📋 Problema Identificado

O vídeo do lance **STW-L2008** é um **YouTube Clip** e está salvo com o formato incorreto:
- ❌ Formato atual: `https://youtube.com/clip/Ugkx6fAvrNFmlE6A0YzBoak5SwE8AgtdBD6m?si=0UQmxUEtmbgZymQk`
- ✅ Formato correto: `https://www.youtube.com/clip/Ugkx6fAvrNFmlE6A0YzBoak5SwE8AgtdBD6m`

## ✅ Solução Implementada

1. **Suporte a YouTube Clips adicionado** ao sistema
   - O componente `VideoEmbed` agora detecta automaticamente YouTube Clips
   - Exibe um card especial com botão para abrir no YouTube
   - YouTube Clips não podem ser embedados diretamente (limitação do YouTube)

2. **Atualização do link no banco de dados**

## 🔧 Como Corrigir

### Opção 1: Executar SQL no Supabase (Recomendado)

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
2. Vá em **SQL Editor**
3. Execute o script abaixo:

```sql
-- Atualizar o videoLink do lance STW-L2008
UPDATE notificacoes_admin
SET dados = jsonb_set(
    dados,
    '{videoLink}',
    '"https://www.youtube.com/clip/Ugkx6fAvrNFmlE6A0YzBoak5SwE8AgtdBD6m"'
)
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';

-- Verificar se foi atualizado
SELECT 
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link_atualizado
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008';
```

### Opção 2: Usar o Script SQL

Execute o arquivo: `scripts/corrigir_video_clip_stw_l2008.sql` no Supabase SQL Editor

## 🎨 Como Funciona Agora

Quando o sistema detectar um YouTube Clip:

1. **Detecta automaticamente** o formato `/clip/`
2. **Exibe um card especial** com:
   - Ícone de clipe 🎬
   - Título "YouTube Clip"
   - Mensagem explicativa
   - Botão vermelho "▶️ Assistir no YouTube"
   - Link do clip abaixo do botão

3. **Ao clicar no botão**, abre o clip diretamente no YouTube

## 📝 Notas Importantes

- ✅ **YouTube Clips são suportados** e exibidos corretamente
- ✅ O link será atualizado para o formato correto (sem `?si=`)
- ✅ O card especial é exibido automaticamente para todos os Clips
- ⚠️ **YouTube Clips não podem ser embedados** (limitação do YouTube)
- ✅ A solução oferece a melhor experiência possível para Clips

## 🔍 Verificar se Funcionou

Após atualizar o banco:

1. Acesse a página onde o lance STW-L2008 é exibido
2. Você deve ver um **card especial** com botão para abrir no YouTube
3. O card terá fundo escuro e botão vermelho do YouTube

---

**Última Atualização:** 27/01/2026
