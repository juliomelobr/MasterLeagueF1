-- =====================================================
-- INSERIR LANCE STW-C2009 MANUALMENTE (Retirada de Bug)
-- =====================================================
-- Dados extraídos da notificação enviada em 12/02/2026 21:53
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
--
-- Se der erro de RLS: Table Editor > notificacoes_admin > 
-- Insert row manualmente com os dados do bloco v_dados abaixo
-- =====================================================

-- 1. Buscar email do acusador (Alexandre Henrique) na tabela pilotos
-- (Opcional - se não encontrar, o insert usa null no email)
DO $$
DECLARE
    v_email TEXT;
    v_dados JSONB;
    v_mensagem TEXT;
BEGIN
    -- Não inserir se já existir
    IF EXISTS (SELECT 1 FROM notificacoes_admin WHERE tipo = 'nova_acusacao' AND dados->>'codigoLance' = 'STW-C2009') THEN
        RAISE NOTICE '⚠️ Lance STW-C2009 já existe. Nada a fazer.';
        RETURN;
    END IF;
    
    -- Buscar email do piloto Alexandre Henrique
    SELECT email INTO v_email
    FROM pilotos
    WHERE UPPER(TRIM(nome)) = 'ALEXANDRE HENRIQUE'
    LIMIT 1;
    
    -- Montar o objeto dados conforme esperado pelo sistema
    v_dados := jsonb_build_object(
        'codigoLance', 'STW-C2009',
        'grid', 'carreira',
        'acusador', jsonb_build_object(
            'nome', 'ALEXANDRE HENRIQUE',
            'gamertag', '',
            'whatsapp', '5545999869196',
            'email', COALESCE(v_email, ''),
            'grid', 'carreira'
        ),
        'acusado', jsonb_build_object(
            'nome', 'Administração Master League F1',
            'gamertag', '-',
            'whatsapp', '-',
            'email', null
        ),
        'etapa', jsonb_build_object(
            'round', 5,
            'circuit', 'Catar',
            'date', '2026-02-12'
        ),
        'descricao', 'Durante a saída do SC na pequena reta que antecede a grande reta esta eu e o piloto Paiva aquecendo os pneus quando acabei me aproximando do Paiva e não houve contato e o jogo me deu 10 segundos de punição.',
        'videoLink', 'https://drive.google.com/file/d/1vGFA9V7y9Ho5ToOAt_77hiEHn9DtyXSw/view?usp=drivesdk',
        'videoEmbed', 'https://drive.google.com/file/d/1vGFA9V7y9Ho5ToOAt_77hiEHn9DtyXSw/preview',
        'temporada', 20,
        'tipoSolicitacao', 'retirada_bug',
        'status', 'aguardando_analise',
        'dataEnvio', '2026-02-12T21:53:00.000Z'
    );
    
    v_mensagem := '🚨 RETIRADA DE BUG - ML F1

🔖 Código: STW-C2009

👤 Acusador: ALEXANDRE HENRIQUE
📱 Gamertag: 
📞 WhatsApp: 5545999869196

ℹ️ Tipo: Retirada de Bug
⚠️ Este lance será analisado pois não possui piloto acusado.

📍 Etapa: 5 - Catar
🏁 Grid: CARREIRA

📝 Descrição:
Durante a saída do SC na pequena reta que antecede a grande reta esta eu e o piloto Paiva aquecendo os pneus quando acabei me aproximando do Paiva e não houve contato e o jogo me deu 10 segundos de punição.

🎥 Vídeo: https://drive.google.com/file/d/1vGFA9V7y9Ho5ToOAt_77hiEHn9DtyXSw/view?usp=drivesdk

🔗 Painel: https://masterleaguef1.com.br/analises

⏰ 12/02/2026, 21:53:00';
    
    -- Inserir na tabela (usando contexto que bypassa RLS no SQL Editor)
    INSERT INTO notificacoes_admin (tipo, dados, mensagem, lido, created_at)
    VALUES (
        'nova_acusacao',
        v_dados,
        v_mensagem,
        false,
        '2026-02-12 21:53:00'::timestamptz
    );
    
    RAISE NOTICE '✅ Lance STW-C2009 inserido com sucesso!';
END $$;

-- 2. Verificar se foi inserido
SELECT 
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    dados->'acusador'->>'nome' as acusador,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-C2009';
