import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente para prevenir scroll automático para o topo em rotas específicas
 * Especialmente útil para páginas como /admin onde o usuário não quer perder a posição
 */
function ScrollRestoration() {
    const { pathname } = useLocation();
    
    // Rotas onde NÃO queremos scroll automático para o topo
    const preserveScrollRoutes = ['/admin'];
    const shouldPreserveScroll = preserveScrollRoutes.includes(pathname);
    
    useEffect(() => {
        if (shouldPreserveScroll) {
            // Prevenir que o React Router faça scroll para o topo
            // Interceptar qualquer tentativa de scroll automático
            const preventAutoScroll = (e) => {
                // Se o scroll está sendo forçado para 0, prevenir
                if (window.scrollY === 0 && document.documentElement.scrollTop === 0) {
                    const savedPosition = sessionStorage.getItem('admin_scroll_position');
                    if (savedPosition && parseInt(savedPosition, 10) > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }
            };
            
            // Restaurar posição salva se existir
            const savedPosition = sessionStorage.getItem('admin_scroll_position');
            if (savedPosition && parseInt(savedPosition, 10) > 0) {
                // Aguardar múltiplos frames para garantir que o DOM está totalmente renderizado
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const pos = parseInt(savedPosition, 10);
                        if (pos > 0) {
                            window.scrollTo({
                                top: pos,
                                left: 0,
                                behavior: 'auto'
                            });
                        }
                    });
                });
            }
            
            // Prevenir scroll automático do React Router
            window.addEventListener('scroll', preventAutoScroll, { passive: false, capture: true });
            
            return () => {
                window.removeEventListener('scroll', preventAutoScroll, { capture: true });
            };
        }
    }, [pathname, shouldPreserveScroll]);
    
    return null; // Componente não renderiza nada
}

export default ScrollRestoration;

