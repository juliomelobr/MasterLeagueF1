/**
 * Obtém texto CSV de uma planilha Google publicada no browser (CORS).
 * corsproxy.io por vezes responde 403; tenta várias estratégias em sequência.
 */

function looksLikeCsvBody(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim();
    if (t.length < 2) return false;
    const lower = t.slice(0, 512).toLowerCase();
    if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<head')) return false;
    return true;
}

/**
 * @param {string} publishedCsvUrl - URL completa .../pub?gid=...&output=csv
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<string>} texto CSV ou '' se todas as tentativas falharem
 */
export async function fetchGoogleSheetCsvText(publishedCsvUrl, options = {}) {
    const timeoutMs = options.timeoutMs ?? 12000;
    if (!publishedCsvUrl || typeof publishedCsvUrl !== 'string') return '';

    const fetchOnce = async (fetchUrl) => {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(fetchUrl, { signal: controller.signal });
            if (!res.ok) return null;
            const text = await res.text();
            return looksLikeCsvBody(text) ? text : null;
        } catch {
            return null;
        } finally {
            clearTimeout(tid);
        }
    };

    const enc = encodeURIComponent(publishedCsvUrl);

    const tries = [
        () => fetchOnce(publishedCsvUrl),
        () => fetchOnce(`https://corsproxy.io/?${enc}`),
        () => fetchOnce(`https://api.allorigins.win/raw?url=${enc}`),
        () => fetchOnce(`https://api.codetabs.com/v1/proxy?quest=${enc}`),
    ];

    for (const run of tries) {
        const text = await run();
        if (text) return text;
    }

    console.warn('⚠️ CSV da planilha indisponível (CORS/proxy):', publishedCsvUrl.slice(0, 96));
    return '';
}
