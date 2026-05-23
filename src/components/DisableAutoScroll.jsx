import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Na rota /admin: bloqueia QUALQUER scroll automático (React Router, focus, scrollIntoView,
 * scrollTo, etc.) para que a tela não "suba" ao abrir Stewards ou ao re-renderizar.
 */
function DisableAutoScroll() {
    const { pathname } = useLocation();
    const shouldDisable = pathname === '/admin' || pathname.startsWith('/admin/');

    useLayoutEffect(() => {
        if (!shouldDisable) return;

        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        const originalScrollTo = window.scrollTo.bind(window);
        const originalScrollBy = window.scrollBy.bind(window);

        window.scrollTo = function (...args) {
            const toTop = args.length === 0 ||
                (args[0] === 0 && (args[1] === undefined || args[1] === 0)) ||
                (typeof args[0] === 'object' && args[0] != null && Number(args[0].top) === 0);
            if (toTop) return;
            return originalScrollTo(...args);
        };
        window.scrollBy = function (...args) {
            const dy = typeof args[0] === 'object' && args[0] != null ? args[0].top : args[1];
            const cur = window.scrollY || document.documentElement.scrollTop;
            if (dy != null && cur + Number(dy) < 0) return;
            return originalScrollBy(...args);
        };

        const originalScrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (...args) {
            if (pathname === '/admin' || pathname.startsWith('/admin/')) return;
            return originalScrollIntoView.apply(this, args);
        };

        let saveTimeout = null;
        const onScroll = () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const y = window.scrollY || document.documentElement.scrollTop;
                if (y > 0) sessionStorage.setItem('admin_scroll_position', String(y));
            }, 150);
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            window.removeEventListener('scroll', onScroll);
            window.scrollTo = originalScrollTo;
            window.scrollBy = originalScrollBy;
            Element.prototype.scrollIntoView = originalScrollIntoView;
        };
    }, [pathname, shouldDisable]);

    return null;
}

export default DisableAutoScroll;


