-- =====================================================
-- FIX RLS - whatsapp_verification_codes (Suporte a Ex-Pilotos)
-- Motivo: Ex-pilotos em cadastro não têm sessão autenticada ainda
-- Solução: Permitir leitura por email para códigos válidos (não usados, não expirados)
-- =====================================================

ALTER TABLE whatsapp_verification_codes ENABLE ROW LEVEL SECURITY;

-- Recriar policies com suporte a ex-pilotos
DROP POLICY IF EXISTS verification_codes_select ON whatsapp_verification_codes;
DROP POLICY IF EXISTS verification_codes_update ON whatsapp_verification_codes;
DROP POLICY IF EXISTS verification_codes_insert ON whatsapp_verification_codes;

-- INSERT: permitido (a Edge Function insere via Service Role; manter simples)
CREATE POLICY verification_codes_insert ON whatsapp_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- SELECT: Permitir leitura por email para códigos válidos
-- Opção 1: Se autenticado, pode ler seu próprio código
-- Opção 2: Se não autenticado, pode ler por email (para ex-pilotos em cadastro)
-- Mas apenas códigos não usados e não expirados (segurança)
CREATE POLICY verification_codes_select ON whatsapp_verification_codes
  FOR SELECT
  USING (
    -- Se autenticado, pode ler seu próprio código
    (
      auth.uid() IS NOT NULL
      AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR
    -- Se não autenticado, pode ler por email (para ex-pilotos em cadastro)
    -- Mas apenas códigos válidos (não usados e não expirados)
    (
      auth.uid() IS NULL
      AND used = false
      AND expires_at > NOW()
    )
  );

-- UPDATE: Permitir atualização por email para códigos válidos
CREATE POLICY verification_codes_update ON whatsapp_verification_codes
  FOR UPDATE
  USING (
    -- Se autenticado, pode atualizar seu próprio código
    (
      auth.uid() IS NOT NULL
      AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR
    -- Se não autenticado, pode atualizar por email (para ex-pilotos em cadastro)
    -- Mas apenas códigos válidos (não usados e não expirados)
    (
      auth.uid() IS NULL
      AND used = false
      AND expires_at > NOW()
    )
  );




































