-- =============================================================================
-- RLS em power_ranking_stats: "new row violates row-level security policy"
-- =============================================================================
-- A política original compara pilotos.email = auth.jwt()->>'email' (case-sensitive)
-- e só stewards. Falhas comuns:
--   - E-mail no Auth com caixa diferente do cadastro em pilotos
--   - E-mail só em user_metadata (alguns provedores OAuth)
--   - is_steward = false para o piloto com esse e-mail
-- Este script recria a política de escrita usando função STABLE + SECURITY DEFINER
-- (lê pilotos sem depender de RLS recursiva) e comparação case-insensitive.
-- Rode no Supabase: SQL Editor → New query → colar → Run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_is_steward_for_rls()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- A) pilotos.id = auth.uid() (cadastro amarrado ao Auth) — não depende de e-mail.
  -- B) auth.users.email = pilotos.email (fonte oficial do login).
  -- C) JWT / user_metadata (fallback).
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

-- Garantir que o papel da API possa escrever (RLS ainda filtra por steward).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.power_ranking_stats TO authenticated;
GRANT SELECT ON TABLE public.power_ranking_stats TO anon;

-- FOR ALL + TO authenticated costuma falhar em upsert (INSERT ... ON CONFLICT UPDATE) em alguns setups.
DROP POLICY IF EXISTS pr_stats_admin_all ON public.power_ranking_stats;
DROP POLICY IF EXISTS pr_stats_steward_insert ON public.power_ranking_stats;
DROP POLICY IF EXISTS pr_stats_steward_update ON public.power_ranking_stats;
DROP POLICY IF EXISTS pr_stats_steward_delete ON public.power_ranking_stats;

CREATE POLICY pr_stats_steward_insert ON public.power_ranking_stats
    FOR INSERT
    WITH CHECK (public.auth_is_steward_for_rls());

CREATE POLICY pr_stats_steward_update ON public.power_ranking_stats
    FOR UPDATE
    USING (public.auth_is_steward_for_rls())
    WITH CHECK (public.auth_is_steward_for_rls());

CREATE POLICY pr_stats_steward_delete ON public.power_ranking_stats
    FOR DELETE
    USING (public.auth_is_steward_for_rls());

COMMENT ON FUNCTION public.auth_is_steward_for_rls() IS
  'RLS power_ranking_stats: steward se pilotos.id=auth.uid() OU e-mail pilotos = auth.users/JWT (case-insensitive).';

-- -----------------------------------------------------------------------------
-- RPC de publicação (contorna RLS na escrita: roda como dono da função/tabela).
-- O app chama supabase.rpc('publish_power_ranking_stats_upsert', { p_rows: [...] }).
-- -----------------------------------------------------------------------------
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
    RAISE EXCEPTION 'p_rows deve ser um array JSON de objetos power_ranking_stats';
  END IF;

  FOR i IN 0 .. COALESCE(jsonb_array_length(p_rows), 0) - 1 LOOP
    el := p_rows->i;
    INSERT INTO public.power_ranking_stats (
      piloto_id,
      season,
      performance,
      racecraft,
      conduta,
      overall,
      historico,
      power_ranking,
      updated_at
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

COMMENT ON FUNCTION public.publish_power_ranking_stats_upsert(jsonb) IS
  'Publica linhas em power_ranking_stats (upsert). Steward obrigatório; escrita ignora RLS da tabela.';
