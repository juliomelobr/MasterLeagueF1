-- =====================================================
-- Adicionar campo "principal" para fixar notícia no topo
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna principal
ALTER TABLE public.noticias 
ADD COLUMN IF NOT EXISTS principal BOOLEAN DEFAULT false;

-- Comentário útil
COMMENT ON COLUMN public.noticias.principal IS 'Se true, esta notícia aparece fixada no topo do portal (apenas 1 deve estar marcada)';

-- ✅ Pronto! Agora você pode marcar uma notícia como principal no Admin.





















