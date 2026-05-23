-- Criar tabela POWER_RANKING_STATS
-- Armazena os resultados calculados dos pilares e a média ponderada final
-- Esta tabela serve como fonte de verdade para o Dashboard do piloto

CREATE TABLE IF NOT EXISTS power_ranking_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piloto_id UUID NOT NULL REFERENCES pilotos(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    
    -- Valores dos Pilares (0-100)
    performance DECIMAL(5,2) DEFAULT 0,
    racecraft DECIMAL(5,2) DEFAULT 0,
    conduta DECIMAL(5,2) DEFAULT 0,
    overall DECIMAL(5,2) DEFAULT 0,
    historico DECIMAL(5,2) DEFAULT 0,
    
    -- Resultado Final (Média Ponderada)
    power_ranking INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(piloto_id, season) -- Um registro por piloto por temporada
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pr_stats_piloto_season ON power_ranking_stats(piloto_id, season);

-- Habilitar RLS
ALTER TABLE power_ranking_stats ENABLE ROW LEVEL SECURITY;

-- Função usada na política de escrita (e-mail case-insensitive; fallback user_metadata).
CREATE OR REPLACE FUNCTION public.auth_is_steward_for_rls()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pilotos p
    WHERE p.is_steward IS TRUE
      AND (
        (auth.uid() IS NOT NULL AND p.id = auth.uid())
        OR (
          p.email IS NOT NULL
          AND (
            (
              auth.uid() IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM auth.users u
                WHERE u.id = auth.uid()
                  AND lower(btrim(COALESCE(u.email::text, ''))) = lower(btrim(COALESCE(p.email::text, '')))
              )
            )
            OR (
              lower(btrim(COALESCE(p.email::text, ''))) = lower(btrim(COALESCE(
                NULLIF(auth.jwt() ->> 'email', ''),
                NULLIF(auth.jwt() #>> '{user_metadata,email}', '')
              , '')))
            )
          )
        )
      )
  );
$$;

ALTER FUNCTION public.auth_is_steward_for_rls() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.auth_is_steward_for_rls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_steward_for_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_steward_for_rls() TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.power_ranking_stats TO authenticated;
GRANT SELECT ON TABLE public.power_ranking_stats TO anon;

-- Stewards: políticas separadas (melhor com upsert do que FOR ALL TO authenticated).
CREATE POLICY pr_stats_steward_insert ON power_ranking_stats
    FOR INSERT
    WITH CHECK (public.auth_is_steward_for_rls());

CREATE POLICY pr_stats_steward_update ON power_ranking_stats
    FOR UPDATE
    USING (public.auth_is_steward_for_rls())
    WITH CHECK (public.auth_is_steward_for_rls());

CREATE POLICY pr_stats_steward_delete ON power_ranking_stats
    FOR DELETE
    USING (public.auth_is_steward_for_rls());

-- Policy: Todos podem ler (para o Dashboard)
CREATE POLICY pr_stats_read ON power_ranking_stats
    FOR SELECT
    USING (true);

-- Publicação pelo admin via RPC (evita RLS direto no upsert do PostgREST)
CREATE OR REPLACE FUNCTION public.publish_power_ranking_stats_upsert(p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
  el jsonb;
BEGIN
  IF NOT public.auth_is_steward_for_rls() THEN
    RAISE EXCEPTION 'Steward necessário para publicar Power Ranking'
      USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows deve ser um array JSON';
  END IF;

  FOR i IN 0 .. COALESCE(jsonb_array_length(p_rows), 0) - 1 LOOP
    el := p_rows->i;
    INSERT INTO public.power_ranking_stats (
      piloto_id, season, performance, racecraft, conduta, overall, historico, power_ranking, updated_at
    )
    VALUES (
      (el->>'piloto_id')::uuid,
      (el->>'season')::integer,
      (el->>'performance')::numeric,
      (el->>'racecraft')::numeric,
      (el->>'conduta')::numeric,
      (el->>'overall')::numeric,
      (el->>'historico')::numeric,
      (el->>'power_ranking')::integer,
      COALESCE((el->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (piloto_id, season) DO UPDATE SET
      performance = EXCLUDED.performance,
      racecraft = EXCLUDED.racecraft,
      conduta = EXCLUDED.conduta,
      overall = EXCLUDED.overall,
      historico = EXCLUDED.historico,
      power_ranking = EXCLUDED.power_ranking,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$;

ALTER FUNCTION public.publish_power_ranking_stats_upsert(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.publish_power_ranking_stats_upsert(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_power_ranking_stats_upsert(jsonb) TO authenticated;

-- Comentários
COMMENT ON TABLE power_ranking_stats IS 'Resultados consolidados do Power Ranking para exibição no Motorhome';

-- Sincronize a temporada exibida / congelamento com scripts/create_season_lifecycle.sql
-- (app_config: current_season, season_phase, last_closed_season).
