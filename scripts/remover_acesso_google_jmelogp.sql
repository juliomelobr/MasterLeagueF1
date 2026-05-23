-- Remove o acesso antigo via Google/Gmail e troca cadastros para o novo e-mail oficial.
-- Execute no Supabase SQL Editor com a conta dona/admin do projeto.

BEGIN;

-- 1) Atualiza tabelas públicas usadas para liberar acesso no site.
UPDATE public.pilotos
SET email = 'juliomelobr@hotmail.com',
    updated_at = COALESCE(updated_at, now())
WHERE lower(trim(email)) = 'jmelogp@gmail.com';

UPDATE public.email_log
SET destinatario = 'juliomelobr@hotmail.com'
WHERE lower(trim(destinatario)) = 'jmelogp@gmail.com';

DO $$
BEGIN
  IF to_regclass('public.jurados') IS NOT NULL THEN
    UPDATE public.jurados
    SET email_google = 'juliomelobr@hotmail.com',
        updated_at = COALESCE(updated_at, now())
    WHERE lower(trim(email_google)) = 'jmelogp@gmail.com';
  END IF;

  IF to_regclass('public.narradores') IS NOT NULL THEN
    UPDATE public.narradores
    SET email = 'juliomelobr@hotmail.com',
        updated_at = COALESCE(updated_at, now())
    WHERE lower(trim(email)) = 'jmelogp@gmail.com';
  END IF;

  IF to_regclass('public.whatsapp_verification_codes') IS NOT NULL THEN
    UPDATE public.whatsapp_verification_codes
    SET email = 'juliomelobr@hotmail.com'
    WHERE lower(trim(email)) = 'jmelogp@gmail.com';
  END IF;

  IF to_regclass('public.season_registrations') IS NOT NULL THEN
    UPDATE public.season_registrations
    SET email_login = 'juliomelobr@hotmail.com'
    WHERE lower(trim(email_login)) = 'jmelogp@gmail.com';
  END IF;

  IF to_regclass('public.notificacoes_admin') IS NOT NULL THEN
    UPDATE public.notificacoes_admin
    SET dados = replace(dados::text, 'jmelogp@gmail.com', 'juliomelobr@hotmail.com')::jsonb
    WHERE dados::text ILIKE '%jmelogp@gmail.com%';
  END IF;
END $$;

-- 2) Revoga o acesso Auth da conta Google/Gmail invadida.
-- Se existir um usuário Auth com esse e-mail, ele e suas identidades OAuth serão removidos.
DELETE FROM auth.identities
WHERE lower(trim(identity_data ->> 'email')) = 'jmelogp@gmail.com'
   OR user_id IN (
      SELECT id
      FROM auth.users
      WHERE lower(trim(email)) = 'jmelogp@gmail.com'
   );

DELETE FROM auth.users
WHERE lower(trim(email)) = 'jmelogp@gmail.com';

-- 3) Conferência final: deve retornar zero nas buscas pelo e-mail antigo.
SELECT 'pilotos' AS tabela, count(*) AS ocorrencias
FROM public.pilotos
WHERE lower(trim(email)) = 'jmelogp@gmail.com'
UNION ALL
SELECT 'auth.users' AS tabela, count(*) AS ocorrencias
FROM auth.users
WHERE lower(trim(email)) = 'jmelogp@gmail.com';

COMMIT;
