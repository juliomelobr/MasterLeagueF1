-- Limpa caches contaminados por HTML/login do Google e dados suspeitos.
-- Execute no Supabase SQL Editor antes de sincronizar novamente.

BEGIN;

DELETE FROM public.classificacao_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%'
   OR season > 21;

DELETE FROM public.power_ranking_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%';

DELETE FROM public.calendario_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%'
   OR season > 21;

DELETE FROM public.tracks_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%';

DELETE FROM public.minicup_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%';

DELETE FROM public.sync_log
WHERE status = 'success'
  AND (
    COALESCE(error_message, '') ILIKE '%accounts.google.com%'
    OR sheet_name IN ('Data Carreira', 'Data Light')
  );

COMMIT;

-- Conferência: todas as contagens devem ser 0.
SELECT 'classificacao_cache_suspeito' AS check_name, count(*) AS total
FROM public.classificacao_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%'
   OR season > 21
UNION ALL
SELECT 'power_ranking_cache_suspeito', count(*)
FROM public.power_ranking_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%'
UNION ALL
SELECT 'calendario_cache_suspeito', count(*)
FROM public.calendario_cache
WHERE data::text ILIKE '%accounts.google.com%'
   OR data::text ILIKE '%<!doctype html%'
   OR data::text ILIKE '%<html%'
   OR data::text ILIKE '%AE:United Arab Emirates%'
   OR data::text ILIKE '%AF:Afghanistan%'
   OR season > 21;
