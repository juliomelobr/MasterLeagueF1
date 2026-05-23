import { getVideoEmbedUrl } from '../utils/videoEmbed';
import { isMobileDevice } from '../utils/deviceDetection';

/**
 * Componente para exibir vídeos embedados
 * 
 * @param {string} videoLink - URL do vídeo
 * @param {string} title - Título do iframe (acessibilidade)
 * @param {string} borderColor - Cor da borda do vídeo
 * @param {boolean} isMobile - Se está em dispositivo mobile (opcional, detecta automaticamente se não fornecido)
 */
function VideoEmbed({ videoLink, title = "Vídeo", borderColor = 'rgba(255,255,255,0.1)', isMobile: isMobileProp }) {
    if (!videoLink) {
        return null;
    }

    // Detectar mobile se não fornecido
    const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileDevice();

    const embedUrl = getVideoEmbedUrl(videoLink);
    
    // Verificar se é um YouTube Clip (não pode ser embedado diretamente)
    // Suporta: youtube.com/clip/ ou www.youtube.com/clip/
    const isYouTubeClip = /youtube\.com\/clip\//i.test(videoLink);
    const clipId = videoLink.match(/youtube\.com\/clip\/([a-zA-Z0-9_-]+)/i)?.[1];
    
    // Verificar se é um YouTube Short
    const isYouTubeShort = videoLink.includes('/shorts/');
    
    // Verificar se é Steam CDN (usa tag <video> HTML5)
    const isSteamCDN = videoLink.includes('cdn.steamusercontent.com');
    
    // Tratamento especial para YouTube Clips
    if (isYouTubeClip && clipId) {
        // Normalizar URL do clip (remover parâmetros ?si=)
        const cleanClipUrl = `https://www.youtube.com/clip/${clipId}`;
        
        return (
            <div 
                style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                    borderRadius: isMobile ? '6px' : '8px',
                    overflow: 'hidden',
                    border: `2px solid ${borderColor}`,
                    padding: isMobile ? '20px' : '30px',
                    boxSizing: 'border-box',
                    textAlign: 'center'
                }}
            >
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: isMobile ? '40px' : '60px', marginBottom: '10px' }}>🎬</div>
                    <h3 style={{ 
                        color: '#fff', 
                        fontSize: isMobile ? '1rem' : '1.2rem', 
                        margin: '0 0 10px 0',
                        fontWeight: 'bold'
                    }}>
                        YouTube Clip
                    </h3>
                    <p style={{ 
                        color: '#94A3B8', 
                        fontSize: isMobile ? '0.85rem' : '0.9rem', 
                        margin: 0,
                        lineHeight: '1.5'
                    }}>
                        Este vídeo é um clip do YouTube e precisa ser visualizado diretamente na plataforma.
                    </p>
                </div>
                <a
                    href={cleanClipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        padding: isMobile ? '12px 24px' : '14px 28px',
                        background: '#FF0000',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(255, 0, 0, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = '#CC0000';
                        e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = '#FF0000';
                        e.target.style.transform = 'scale(1)';
                    }}
                >
                    ▶️ Assistir no YouTube
                </a>
                <div style={{ 
                    marginTop: '15px', 
                    fontSize: isMobile ? '0.75rem' : '0.8rem', 
                    color: '#64748B',
                    wordBreak: 'break-all'
                }}>
                    {cleanClipUrl}
                </div>
            </div>
        );
    }
    
    if (embedUrl) {
        // Para Steam CDN, usar tag <video> HTML5
        if (isSteamCDN) {
            return (
                <div 
                    style={{
                        width: '100%',
                        background: '#000',
                        borderRadius: isMobile ? '6px' : '8px',
                        overflow: 'hidden',
                        border: `2px solid ${borderColor}`,
                        position: 'relative',
                        aspectRatio: '16 / 9',
                        boxSizing: 'border-box'
                    }}
                >
                    <video
                        src={embedUrl}
                        controls
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            outline: 'none'
                        }}
                        preload="metadata"
                    >
                        Seu navegador não suporta a tag de vídeo.
                    </video>
                </div>
            );
        }
        
        // Para YouTube Shorts, usar formato vertical 9:16
        // Para vídeos normais, usar formato 16:9 (1920x1080p)
        const aspectRatio = isYouTubeShort ? '9 / 16' : '16 / 9';
        
        // No mobile, ajustar largura máxima para Shorts
        const containerMaxWidth = isMobile 
            ? (isYouTubeShort ? '100%' : '100%')
            : (isYouTubeShort ? '400px' : '100%');
        const containerMargin = isMobile ? '0' : (isYouTubeShort ? '0 auto' : '0');
        
        return (
            <div 
                style={{
                    width: '100%',
                    maxWidth: containerMaxWidth,
                    margin: containerMargin,
                    background: '#000',
                    borderRadius: isMobile ? '6px' : '8px',
                    overflow: 'hidden',
                    border: `2px solid ${borderColor}`,
                    position: 'relative',
                    aspectRatio: aspectRatio,
                    // No mobile, garantir que o vídeo não ultrapasse a largura da tela
                    boxSizing: 'border-box'
                }}
            >
                <iframe
                    src={embedUrl}
                    title={title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        // Garantir que o iframe respeite o container no mobile
                        maxWidth: '100%'
                    }}
                />
            </div>
        );
    }
    
    // Fallback para vídeos não suportados
    return (
        <a
            href={videoLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'block',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                color: '#3B82F6',
                textDecoration: 'none',
                textAlign: 'center',
                fontSize: '14px'
            }}
        >
            🔗 Ver Vídeo Externo
        </a>
    );
}

export default VideoEmbed;

