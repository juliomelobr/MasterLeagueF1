-- =====================================================
-- SETUP COMPLETO: CMS DE NOTÍCIAS NO SUPABASE
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de notícias
CREATE TABLE IF NOT EXISTS public.noticias (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  date TEXT,
  category TEXT DEFAULT 'Notícia',
  featured BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.noticias;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.noticias;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.noticias;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.noticias;

-- 4. Política: Permitir leitura pública (para o site exibir)
CREATE POLICY "Enable read access for all users"
ON public.noticias
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Política: Permitir inserção, atualização e exclusão para todos
-- ⚠️ Em produção, você pode querer restringir isso apenas para authenticated
CREATE POLICY "Enable all access for news management"
ON public.noticias
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_noticias_updated_at ON public.noticias;
CREATE TRIGGER update_noticias_updated_at
BEFORE UPDATE ON public.noticias
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. Habilitar Realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE noticias;

-- 9. Comentários úteis
COMMENT ON TABLE public.noticias IS 'Tabela de notícias gerenciadas pelo CMS do Admin';
COMMENT ON COLUMN public.noticias.id IS 'ID da notícia (usado também para referenciar imagens)';
COMMENT ON COLUMN public.noticias.title IS 'Título da notícia';
COMMENT ON COLUMN public.noticias.excerpt IS 'Resumo ou texto completo da notícia';
COMMENT ON COLUMN public.noticias.date IS 'Data de publicação (formato texto)';
COMMENT ON COLUMN public.noticias.category IS 'Categoria da notícia (Corrida, Análise, etc)';
COMMENT ON COLUMN public.noticias.featured IS 'Se a notícia é destaque (aparece em destaque no feed)';
COMMENT ON COLUMN public.noticias.link IS 'Link externo para redirecionar (opcional)';

-- 10. Inserir notícias de exemplo (opcional)
-- Descomente as linhas abaixo se quiser inserir exemplos

-- INSERT INTO public.noticias (id, title, excerpt, date, category, featured, link) VALUES
-- (1, 'Primeira Notícia de Teste', 'Este é o resumo da primeira notícia. Você pode adicionar parágrafos aqui.', '23/12/2025', 'Notícia', true, null),
-- (2, 'Segunda Notícia', 'Outro exemplo de notícia para testar o sistema.', '22/12/2025', 'Análise', false, 'https://exemplo.com'),
-- (3, 'Terceira Notícia', 'Mais uma notícia de exemplo para o feed.', '21/12/2025', 'Corrida', false, null);

-- ✅ Pronto! A tabela de notícias foi criada com sucesso.
-- Agora você pode gerenciar as notícias diretamente pelo Admin.





















