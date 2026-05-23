-- Tabela de inscrições de pilotos por formulário do site
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS season_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada INTEGER NOT NULL DEFAULT 20,
    nome TEXT NOT NULL,
    gamertag_id TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    plataforma TEXT NOT NULL CHECK (plataforma IN ('xbox', 'play', 'pc')),
    grid TEXT NOT NULL CHECK (grid IN ('carreira', 'light', 'open')),
    email_login TEXT NOT NULL,
    data_inscricao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nome_piloto_transmissao TEXT NOT NULL,
    numero_carro TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL DEFAULT 'pix_agora' CHECK (forma_pagamento IN ('ja_paguei', 'pix_agora', 'pagar_depois', 'adm', 'premiacao_equipe')),
    data_pagamento_prevista DATE,
    status_inscricao TEXT NOT NULL DEFAULT 'pendente' CHECK (status_inscricao IN ('pendente', 'aprovado', 'reserva', 'recusado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_registrations_data_inscricao
    ON season_registrations (data_inscricao DESC);

CREATE INDEX IF NOT EXISTS idx_season_registrations_status
    ON season_registrations (status_inscricao);

-- Migração defensiva para bases onde a tabela já existe sem a coluna temporada
ALTER TABLE season_registrations
    ADD COLUMN IF NOT EXISTS temporada INTEGER;

UPDATE season_registrations
SET temporada = 20
WHERE temporada IS NULL;

ALTER TABLE season_registrations
    ALTER COLUMN temporada SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_season_registrations_temporada
    ON season_registrations (temporada);

ALTER TABLE season_registrations ENABLE ROW LEVEL SECURITY;

-- Inserção pública pelo formulário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_insert_public'
    ) THEN
        CREATE POLICY season_registrations_insert_public
            ON season_registrations
            FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- Leitura para JWT autenticado (Supabase Auth)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_read_auth'
    ) THEN
        CREATE POLICY season_registrations_read_auth
            ON season_registrations
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Leitura para anon: o painel ADM do site usa senha própria (sem sessão Supabase Auth),
-- logo o cliente fica como role anon. Sem esta política o .select() retorna 0 linhas.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_read_anon'
    ) THEN
        CREATE POLICY season_registrations_read_anon
            ON season_registrations
            FOR SELECT
            TO anon
            USING (true);
    END IF;
END $$;

-- Edição para JWT autenticado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_update_auth'
    ) THEN
        CREATE POLICY season_registrations_update_auth
            ON season_registrations
            FOR UPDATE
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- UPDATE pelo painel ADM (anon). Mesma razão do SELECT acima.
-- A chave anon já está no front; reforce segurança com URL do /admin obscura ou migre para Supabase Auth.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_update_anon'
    ) THEN
        CREATE POLICY season_registrations_update_anon
            ON season_registrations
            FOR UPDATE
            TO anon
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Exclusão pelo painel ADM (anon)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_delete_anon'
    ) THEN
        CREATE POLICY season_registrations_delete_anon
            ON season_registrations
            FOR DELETE
            TO anon
            USING (true);
    END IF;
END $$;

-- URL pública da foto anexada no formulário (Supabase Storage)
ALTER TABLE season_registrations
    ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Controle: marca quando a mensagem automática de boas-vindas foi enviada
ALTER TABLE season_registrations
    ADD COLUMN IF NOT EXISTS boas_vindas_enviada_em TIMESTAMPTZ;

-- Bucket para fotos de inscrição (execute uma vez; depois confira no Dashboard → Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'inscricoes-fotos',
    'inscricoes-fotos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública das imagens (URL pública no insert)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'inscricoes_fotos_select_public'
    ) THEN
        CREATE POLICY inscricoes_fotos_select_public
            ON storage.objects
            FOR SELECT
            TO public
            USING (bucket_id = 'inscricoes-fotos');
    END IF;
END $$;

-- Upload anônimo (formulário público sem login)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'inscricoes_fotos_insert_anon'
    ) THEN
        CREATE POLICY inscricoes_fotos_insert_anon
            ON storage.objects
            FOR INSERT
            TO anon
            WITH CHECK (bucket_id = 'inscricoes-fotos');
    END IF;
END $$;

-- Temporada exibida nas inscrições: alinhar com app_config (current_season / ciclo) via
-- scripts/create_season_lifecycle.sql quando for atualizar a temporada global.
