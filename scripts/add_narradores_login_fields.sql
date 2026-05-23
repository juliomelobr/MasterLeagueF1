-- Adiciona campos de acesso por usuário e perfil na tabela narradores.
-- Execute no Supabase SQL Editor.

ALTER TABLE public.narradores
ADD COLUMN IF NOT EXISTS usuario VARCHAR(80);

ALTER TABLE public.narradores
ADD COLUMN IF NOT EXISTS papel VARCHAR(20) DEFAULT 'narrador';

UPDATE public.narradores
SET usuario = split_part(lower(email), '@', 1)
WHERE (usuario IS NULL OR trim(usuario) = '')
  AND email IS NOT NULL;

UPDATE public.narradores
SET papel = 'narrador'
WHERE papel IS NULL OR trim(papel) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'narradores_papel_check'
    ) THEN
        ALTER TABLE public.narradores
        ADD CONSTRAINT narradores_papel_check
        CHECK (papel IN ('narrador', 'admin'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_narradores_usuario_unique
ON public.narradores (lower(usuario))
WHERE usuario IS NOT NULL;

-- Força o PostgREST/Supabase a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
