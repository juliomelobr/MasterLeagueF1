-- =====================================================
-- TRIGGER: Atualizar propostas quando contrato é criado
-- =====================================================
-- Este script cria um trigger que automaticamente marca
-- todas as propostas OFFER_SENT de um piloto como REJECTED
-- quando um contrato é criado para esse piloto
-- =====================================================

-- Criar função que será executada pelo trigger
CREATE OR REPLACE FUNCTION reject_pilot_proposals_on_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um novo contrato é criado, marcar todas as propostas
    -- OFFER_SENT deste piloto (no mesmo grid e season) como REJECTED
    UPDATE interests 
    SET 
        status = 'REJECTED',
        updated_at = NOW()
    WHERE 
        pilot_cod_idml = NEW.pilot_cod_idml
        AND status = 'OFFER_SENT'
        AND season = NEW.season;
    
    -- Log para debug
    RAISE NOTICE 'Contrato criado para pilot_cod_idml: %. Propostas OFFER_SENT marcadas como REJECTED.', NEW.pilot_cod_idml;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_reject_proposals_on_contract ON contracts;

-- Criar trigger que executa após INSERT na tabela contracts
CREATE TRIGGER trigger_reject_proposals_on_contract
    AFTER INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION reject_pilot_proposals_on_contract();

-- Comentário
COMMENT ON FUNCTION reject_pilot_proposals_on_contract() IS 
    'Marca todas as propostas OFFER_SENT de um piloto como REJECTED quando um contrato é criado';

-- =====================================================
-- TESTE DO TRIGGER
-- =====================================================
-- Para testar:
-- 1. Criar uma proposta OFFER_SENT para um piloto
-- 2. Criar um contrato para esse mesmo piloto
-- 3. Verificar se a proposta foi automaticamente marcada como REJECTED
-- 
-- Exemplo:
-- SELECT * FROM interests WHERE pilot_cod_idml = 'MLFI-0138' AND status = 'OFFER_SENT';
-- -- Criar contrato manualmente para teste
-- INSERT INTO contracts (pilot_cod_idml, team_id, grid, season) 
-- VALUES ('MLFI-0138', 'aston_martin', 'carreira', 20);
-- -- Verificar se propostas foram marcadas como REJECTED
-- SELECT * FROM interests WHERE pilot_cod_idml = 'MLFI-0138';
-- =====================================================






