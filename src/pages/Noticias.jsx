import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Noticias = () => {
    const [noticias, setNoticias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroCategoria, setFiltroCategoria] = useState('todas');
    const [categorias, setCategorias] = useState(['todas']);
    const location = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        carregarNoticias();
    }, []);

    // Scroll para notícia específica se vier com hash (#noticia-1)
    useEffect(() => {
        if (location.hash && noticias.length > 0) {
            setTimeout(() => {
                const element = document.querySelector(location.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, [location.hash, noticias]);

    const carregarNoticias = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('noticias')
                .select('*')
                .order('id', { ascending: false });
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                // Ordenar por ID decrescente (maior ID = mais recente/principal)
                const sorted = [...data].sort((a, b) => b.id - a.id);
                
                setNoticias(sorted);
                
                // Extrair categorias únicas
                const cats = ['todas', ...new Set(data.map(n => n.category).filter(Boolean))];
                setCategorias(cats);
            }
        } catch (err) {
            console.error('Erro ao carregar notícias:', err);
        } finally {
            setLoading(false);
        }
    };

    const getSupabaseImageUrl = (id) => {
        try {
            const { data } = supabase.storage.from('noticias').getPublicUrl(`noticia${id}`);
            return data?.publicUrl || null;
        } catch {
            return null;
        }
    };

    // Função para processar o conteúdo e aplicar formatação
    const processarConteudo = (texto) => {
        if (!texto) return '';
        
        let processado = texto;
        
        // Substituir ## Título por <h3>
        processado = processado.replace(/## (.*?)(\n|$)/g, '<h3 class="noticia-section-title">$1</h3>');
        
        // Substituir **texto** por <strong>texto</strong>
        processado = processado.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Converter parágrafos
        processado = processado.replace(/\n\n/g, '</p><p>');
        processado = processado.replace(/\n/g, '<br/>');
        
        if (!processado.startsWith('<')) {
            processado = '<p>' + processado + '</p>';
        }
        
        return processado;
    };

    const noticiasFiltradas = filtroCategoria === 'todas' 
        ? noticias 
        : noticias.filter(n => n.category === filtroCategoria);

    return (
        <div className="noticias-portal-page">
            {/* Header */}
            <header className="noticias-portal-header">
                <div className="noticias-portal-hero">
                    <h1>📰 Central de Notícias</h1>
                    <p>Fique por dentro de tudo que acontece na Master League F1</p>
                </div>
            </header>

            {/* Filtros removidos para otimizar espaço */}

            {/* Feed de Notícias Completas */}
            <div className="noticias-portal-container">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <p>⏳ Carregando notícias...</p>
                    </div>
                ) : noticiasFiltradas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <p>📭 Nenhuma notícia encontrada nesta categoria</p>
                    </div>
                ) : (
                    <div className="noticias-feed-completo">
                        {noticiasFiltradas.map((noticia, idx) => {
                            const imageUrl = getSupabaseImageUrl(noticia.id);
                            
                            return (
                                <article 
                                    key={noticia.id} 
                                    id={`noticia-${noticia.id}`}
                                    className="noticia-artigo-completo"
                                >
                                    {/* Header da Notícia */}
                                    <div className="noticia-artigo-header">
                                        <div className="noticia-artigo-meta">
                                            {idx === 0 && (
                                                <span className="noticia-badge-principal">📌 PRINCIPAL</span>
                                            )}
                                            <span className="noticia-artigo-category">{noticia.category}</span>
                                            <span className="noticia-artigo-date">📅 {noticia.date}</span>
                                        </div>
                                        <h2 className="noticia-artigo-title">{noticia.title}</h2>
                                    </div>

                                    {/* Imagem com Subtítulo e Compartilhamento */}
                                    {imageUrl && (
                                        <div className="noticia-artigo-image-container">
                                            <img 
                                                src={imageUrl} 
                                                alt={noticia.title}
                                                onError={(e) => e.target.parentElement.style.display = 'none'}
                                            />
                                            <div className="noticia-artigo-overlay"></div>
                                            
                                            {/* Botões de Compartilhamento */}
                                            <div className="noticia-artigo-share">
                                                <button 
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/noticias#noticia-${noticia.id}`;
                                                        const text = `${noticia.title} - Master League F1`;
                                                        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                                                    }}
                                                    className="share-btn-small whatsapp"
                                                    title="Compartilhar no WhatsApp"
                                                >
                                                    WhatsApp
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/noticias#noticia-${noticia.id}`;
                                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(noticia.title)}&url=${encodeURIComponent(url)}`, '_blank');
                                                    }}
                                                    className="share-btn-small twitter"
                                                    title="Compartilhar no Twitter"
                                                >
                                                    Twitter
                                                </button>
                                            </div>
                                            
                                            {/* Subtítulo sobre a foto */}
                                            {noticia.subtitle && (
                                                <div className="noticia-artigo-subtitle-overlay">
                                                    <p>{noticia.subtitle}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Conteúdo da Matéria */}
                                    <div className="noticia-artigo-content">
                                        {noticia.content ? (
                                            <div 
                                                className="noticia-artigo-body" 
                                                dangerouslySetInnerHTML={{ __html: processarConteudo(noticia.content) }}
                                            />
                                        ) : (
                                            <p style={{ color: '#64748B', textAlign: 'center', padding: '20px' }}>
                                                📝 Conteúdo ainda não adicionado
                                            </p>
                                        )}

                                        {/* Link externo se houver */}
                                        {noticia.link && (
                                            <div className="noticia-artigo-link-externo">
                                                <h4>🔗 Links da Matéria</h4>
                                                <a href={noticia.link} target="_blank" rel="noopener noreferrer">
                                                    {noticia.link}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Separador entre notícias */}
                                    {idx < noticiasFiltradas.length - 1 && (
                                        <div className="noticia-separador"></div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Noticias;