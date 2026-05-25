/**
 * Utilitários para manipulação de URLs
 * Resolve problemas com localhost no PC vs IP da rede no celular
 */

export const PRODUCTION_SITE_URL = 'https://masterleaguef1.com.br';

/**
 * Obtém a URL base dinamicamente baseada na origem atual
 * Resolve o problema de localhost no PC vs IP da rede no celular
 * 
 * @returns {string} URL base (ex: http://192.168.0.15:5173 ou https://meusite.com)
 */
export function getBaseUrl() {
    const origin = window.location.origin;
    const port = window.location.port;
    
    let baseUrl = origin;
    
    if (port && !origin.includes(`:${port}`)) {
        baseUrl = `${window.location.protocol}//${window.location.hostname}:${port}`;
    }
    
    if (process.env.NODE_ENV === 'development') {
        console.log('🌐 Base URL detectada:', {
            origin,
            hostname: window.location.hostname,
            port,
            baseUrl,
            fullHref: window.location.href,
            isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
            isIP: /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)
        });
    }
    
    return baseUrl;
}

/**
 * Obtém a URL de redirecionamento para autenticação
 * 
 * @param {string} path - Caminho de redirecionamento (ex: '/login', '/dashboard')
 * @returns {string} URL completa de redirecionamento
 */
export function getRedirectUrl(path = '/login') {
    const baseUrl = getBaseUrl();
    // Garantir que o path comece com /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const redirectUrl = `${baseUrl}${cleanPath}`;
    
    if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Redirect URL gerada:', redirectUrl);
    }
    
    return redirectUrl;
}

/**
 * Verifica se está rodando em ambiente de desenvolvimento local
 * 
 * @returns {boolean} true se estiver em localhost ou IP local
 */
export function isLocalDevelopment() {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalIP = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
    
    return isLocalhost || isLocalIP;
}


















