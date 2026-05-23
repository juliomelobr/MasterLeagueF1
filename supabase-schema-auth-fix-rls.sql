-- =====================================================
-- FIX RLS - whatsapp_verification_codes
-- Motivo: policies antigas dependiam de auth.users e podem bloquear SELECT/UPDATE
-- Recomendado: usar o email do JWT (auth.jwt()->>'email')
-- =====================================================

ALTER TABLE whatsapp_verification_codes ENABLE ROW LEVEL SECURITY;

-- Recriar policies com segurança
DROP POLICY IF EXISTS verification_codes_select ON whatsapp_verification_codes;
DROP POLICY IF EXISTS verification_codes_update ON whatsapp_verification_codes;
DROP POLICY IF EXISTS verification_codes_insert ON whatsapp_verification_codes;

-- INSERT: permitido (a Edge Function insere via Service Role; manter simples)
CREATE POLICY verification_codes_insert ON whatsapp_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- SELECT: apenas usuário autenticado lendo o próprio email
CREATE POLICY verification_codes_select ON whatsapp_verification_codes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- UPDATE: apenas usuário autenticado atualizando o próprio email
CREATE POLICY verification_codes_update ON whatsapp_verification_codes
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );





































