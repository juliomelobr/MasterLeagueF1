-- =====================================================
-- UPDATE: Schema de Notícias com Subtítulo e Categorias Personalizadas
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna de subtítulo
ALTER TABLE public.noticias 
ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- 2. Adicionar coluna de conteúdo completo (separado do resumo)
ALTER TABLE public.noticias 
ADD COLUMN IF NOT EXISTS content TEXT;

-- 3. Comentários úteis
COMMENT ON COLUMN public.noticias.subtitle IS 'Subtítulo/linha fina da notícia';
COMMENT ON COLUMN public.noticias.excerpt IS 'Resumo curto para exibir na home';
COMMENT ON COLUMN public.noticias.content IS 'Conteúdo completo da notícia (usar negrito com **texto**)';
COMMENT ON COLUMN public.noticias.category IS 'Categoria da notícia (pode ser personalizada)';

-- ✅ Pronto! Agora você pode usar subtítulo e categorias personalizadas.





















