-- =====================================================
-- SETUP COMPLETO: NOTÍCIAS COM SUPABASE STORAGE
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- Passo a passo completo no arquivo: GUIA_NOTICIAS_SUPABASE_STORAGE.md

-- 1. Criar tabela news_images (guarda versão/timestamp para cache-busting)
CREATE TABLE IF NOT EXISTS public.news_images (
  slot INTEGER PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS (Row Level Security) na tabela
ALTER TABLE public.news_images ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas (se existirem) para evitar conflitos
DROP POLICY IF EXISTS "public can read news_images" ON public.news_images;
DROP POLICY IF EXISTS "public can upsert news_images" ON public.news_images;
DROP POLICY IF EXISTS "public can insert news_images" ON public.news_images;
DROP POLICY IF EXISTS "public can update news_images" ON public.news_images;
DROP POLICY IF EXISTS "Public read access" ON public.news_images;
DROP POLICY IF EXISTS "Public upload access" ON public.news_images;

-- 4. Policy: Permitir leitura pública (para o site exibir)
CREATE POLICY "public can read news_images"
ON public.news_images
FOR SELECT
TO anon
USING (true);

-- 5. Policy: Permitir inserção para anon (para o Admin fazer upload)
-- ⚠️ ATENÇÃO: Isso permite que qualquer pessoa com a anon key faça upload
-- Para produção, considere usar Supabase Auth ou Edge Function
CREATE POLICY "public can insert news_images"
ON public.news_images
FOR INSERT
TO anon
WITH CHECK (true);

-- 6. Policy: Permitir atualização para anon (para o Admin fazer upload)
CREATE POLICY "public can update news_images"
ON public.news_images
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 7. Comentários úteis
COMMENT ON TABLE public.news_images IS 'Tabela que guarda o timestamp de atualização das imagens de notícias. Usado para cache-busting nas URLs.';
COMMENT ON COLUMN public.news_images.slot IS 'ID da notícia (1, 2, 3, etc). Corresponde ao nome do arquivo: noticia1, noticia2, etc.';
COMMENT ON COLUMN public.news_images.updated_at IS 'Timestamp de quando a imagem foi atualizada. Usado para quebrar cache do navegador.';


