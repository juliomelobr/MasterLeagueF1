export default function TeamCard({ team, currentPilot, onManifestInterest, onCancelInterest, onSignContract, canApplyToTeam }) {
    const interest = team.currentPilotInterest;
    
    // Validação local
    const validateLocal = () => {
        if (!currentPilot) return { allowed: false, reason: 'Faça login para manifestar interesse' };
        
        // Máximo de 3 interesses
        const activeInterests = team.currentPilotInterest ? 1 : 0; // Simplificado - deveria contar todos
        if (activeInterests >= 3) return { allowed: false, reason: 'Máximo de 3 interesses atingido' };
        
        // Tier Gate: Top 10 pode aplicar para GOLD
        if (team.tier === 'GOLD' && currentPilot?.draft_priority > 10) {
            return { allowed: false, reason: 'Apenas Top 10 pode aplicar para GOLD' };
        }
        
        return { allowed: true };
    };
    
    const validation = canApplyToTeam ? canApplyToTeam(currentPilot, team) : validateLocal();
    
    // Determinar estado do card
    const getCardState = () => {
        if (!currentPilot) return 'disabled';
        
        // Se tem contrato assinado com esta equipe
        if (interest?.status === 'ACCEPTED') return 'signed';
        
        // Se recebeu proposta desta equipe
        if (interest?.status === 'OFFER_SENT') return 'offer_received';
        
        // Se manifestou interesse (aguardando)
        if (interest?.status === 'PENDING') return 'interested';
        
        // Se não pode aplicar (tier gate ou limite)
        if (!validation.allowed && team.tier === 'GOLD' && currentPilot?.draft_priority > 10) return 'blocked_tier';
        
        // Se não pode aplicar (outros motivos)
        if (!validation.allowed) return 'disabled';
        
        // Disponível para aplicar
        return 'available';
    };

    const cardState = getCardState();
    
    // Cores por tier
    const tierColors = {
        GOLD: { bg: 'rgba(255, 215, 0, 0.1)', border: '#FFD700', text: '#FFD700' },
        SILVER: { bg: 'rgba(192, 192, 192, 0.1)', border: '#C0C0C0', text: '#C0C0C0' },
        BRONZE: { bg: 'rgba(205, 127, 50, 0.1)', border: '#CD7F32', text: '#CD7F32' }
    };

    const tierColor = tierColors[team.tier] || tierColors.BRONZE;

    // Estilo do card baseado no estado
    const getCardStyle = () => {
        const baseStyle = {
            background: '#1E293B',
            padding: '20px',
            borderRadius: '16px',
            border: `2px solid ${tierColor.border}`,
            position: 'relative',
            transition: 'all 0.3s ease',
            opacity: cardState === 'disabled' || cardState === 'blocked_tier' ? 0.6 : 1
        };

        if (cardState === 'offer_received') {
            return {
                ...baseStyle,
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%)',
                border: `3px solid #FFD700`,
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
            };
        }

        if (cardState === 'signed') {
            return {
                ...baseStyle,
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)',
                border: `3px solid #22C55E`
            };
        }

        if (cardState === 'interested') {
            return {
                ...baseStyle,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
                border: `2px solid #3B82F6`
            };
        }

        return baseStyle;
    };

    const handleButtonClick = () => {
        if (cardState === 'offer_received') {
            onSignContract(interest.id);
        } else if (cardState === 'interested') {
            onCancelInterest(interest.id);
        } else if (cardState === 'available') {
            onManifestInterest(team.id);
        }
    };

    const getButtonConfig = () => {
        switch (cardState) {
            case 'signed':
                return { text: '✓ CONTRATO ASSINADO', color: '#22C55E', disabled: true };
            case 'offer_received':
                return { text: 'ASSINAR CONTRATO', color: '#FFD700', disabled: false };
            case 'interested':
                return { text: 'CANCELAR INTERESSE', color: '#EF4444', disabled: false };
            case 'blocked_tier':
                return { text: 'BLOQUEADO (TOP 10)', color: '#94A3B8', disabled: true };
            case 'disabled':
                return { text: validation.reason || 'INDISPONÍVEL', color: '#94A3B8', disabled: true };
            default:
                return { text: 'TENHO INTERESSE', color: tierColor.border, disabled: false };
        }
    };

    const buttonConfig = getButtonConfig();

    return (
        <div style={getCardStyle()}>
            {/* Badge de Tier */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: tierColor.bg,
                border: `1px solid ${tierColor.border}`,
                borderRadius: '12px',
                padding: '4px 10px',
                fontSize: '0.7rem',
                fontWeight: '700',
                color: tierColor.text,
                textTransform: 'uppercase'
            }}>
                {team.tier}
            </div>

            {/* Logo/Nome da Equipe */}
            <div style={{ marginBottom: '15px' }}>
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    marginBottom: '5px',
                    color: team.color
                }}>
                    {team.name}
                </h3>
                <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.6)',
                    fontStyle: 'italic'
                }}>
                    {team.tier === 'GOLD' && 'Foco: Título'}
                    {team.tier === 'SILVER' && 'Foco: Pódio'}
                    {team.tier === 'BRONZE' && 'Foco: Pontos'}
                </div>
            </div>

            {/* Vagas Disponíveis */}
            <div style={{
                background: '#0F172A',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    Vagas Disponíveis
                </span>
                <span style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: team.available > 0 ? '#22C55E' : '#EF4444'
                }}>
                    {team.available}/{team.total}
                </span>
            </div>

            {/* Status do Interesse */}
            {interest && (
                <div style={{
                    background: cardState === 'offer_received' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    color: cardState === 'offer_received' ? '#FFD700' : '#3B82F6',
                    fontWeight: '600'
                }}>
                    {cardState === 'offer_received' && '🎉 PROPOSTA RECEBIDA!'}
                    {cardState === 'interested' && '⏳ Aguardando resposta...'}
                    {cardState === 'signed' && '✅ Contrato assinado!'}
                </div>
            )}

            {/* Botão de Ação */}
            <button
                onClick={handleButtonClick}
                disabled={buttonConfig.disabled}
                style={{
                    width: '100%',
                    background: buttonConfig.disabled ? '#374151' : buttonConfig.color,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    color: buttonConfig.disabled ? '#9CA3AF' : (buttonConfig.color === '#FFD700' ? '#000' : '#fff'),
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase'
                }}
                onMouseOver={(e) => {
                    if (!buttonConfig.disabled) {
                        e.target.style.opacity = '0.9';
                        e.target.style.transform = 'scale(1.02)';
                    }
                }}
                onMouseOut={(e) => {
                    if (!buttonConfig.disabled) {
                        e.target.style.opacity = '1';
                        e.target.style.transform = 'scale(1)';
                    }
                }}
            >
                {buttonConfig.text}
            </button>

            {/* Mensagem de bloqueio */}
            {cardState === 'blocked_tier' && (
                <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#EF4444',
                    textAlign: 'center'
                }}>
                    Apenas Top 10 pode aplicar
                </div>
            )}
        </div>
    );
}
