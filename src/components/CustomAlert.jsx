import { useEffect } from 'react';
import '../index.css';

/**
 * Componente de Alert/Confirm customizado com design do site
 * @param {Object} props
 * @param {boolean} props.show - Se o popup está visível
 * @param {string} props.title - Título do popup
 * @param {string} props.message - Mensagem do popup
 * @param {string} props.type - Tipo: 'alert' ou 'confirm'
 * @param {Function} props.onConfirm - Callback quando confirma
 * @param {Function} props.onCancel - Callback quando cancela (apenas para confirm)
 * @param {string} props.confirmText - Texto do botão de confirmação
 * @param {string} props.cancelText - Texto do botão de cancelamento
 */
function CustomAlert({
    show,
    title,
    message,
    type = 'alert',
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancelar'
}) {
    useEffect(() => {
        if (show) {
            // Prevenir scroll do body quando popup está aberto
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [show]);

    if (!show) return null;

    // Quebrar mensagem em linhas se tiver \n
    const messageLines = message.split('\n');

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
                animation: 'fadeIn 0.2s ease-out',
                fontFamily: "'Montserrat', sans-serif"
            }}
            onClick={(e) => {
                // Fechar ao clicar no overlay (apenas para alert)
                if (type === 'alert' && e.target === e.currentTarget) {
                    onConfirm?.();
                }
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    borderRadius: '16px',
                    border: '2px solid rgba(6, 182, 212, 0.3)',
                    padding: '30px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                    animation: 'slideUp 0.3s ease-out',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Efeito de brilho no topo */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #06B6D4, #3B82F6, #C1121F)',
                        opacity: 0.8
                    }}
                />

                {/* Ícone e Título */}
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                        {type === 'confirm' ? '❓' : '⚠️'}
                    </div>
                    {title && (
                        <h2
                            style={{
                                color: '#F8FAFC',
                                fontSize: '1.5rem',
                                fontWeight: '800',
                                margin: 0,
                                marginBottom: '10px',
                                background: 'linear-gradient(90deg, #06B6D4, #3B82F6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            {title}
                        </h2>
                    )}
                </div>

                {/* Mensagem */}
                <div
                    style={{
                        color: '#CBD5E1',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        marginBottom: '30px',
                        textAlign: 'center',
                        whiteSpace: 'pre-line'
                    }}
                >
                    {messageLines.map((line, index) => (
                        <div key={index} style={{ marginBottom: line.trim() ? '8px' : '4px' }}>
                            {line.trim() || '\u00A0'}
                        </div>
                    ))}
                </div>

                {/* Botões */}
                <div
                    style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center'
                    }}
                >
                    {type === 'confirm' && (
                        <button
                            type="button"
                            onClick={() => {
                                onCancel?.();
                            }}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: 'rgba(148, 163, 184, 0.1)',
                                border: '2px solid rgba(148, 163, 184, 0.3)',
                                borderRadius: '8px',
                                color: '#94A3B8',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: "'Montserrat', sans-serif",
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(148, 163, 184, 0.2)';
                                e.target.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(148, 163, 184, 0.1)';
                                e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm?.();
                        }}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontSize: '0.95rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: "'Montserrat', sans-serif",
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.3)';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

export default CustomAlert;










































