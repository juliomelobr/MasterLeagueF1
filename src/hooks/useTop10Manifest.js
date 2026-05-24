import { useEffect, useState } from 'react';

/**
 * Hook que carrega o manifest público com a lista de PNGs de TOP 10
 * já gerados pelo GitHub Action (escritos em
 * `public/highlights/top10-manifest.json`).
 *
 * O retorno é um Map indexado por `${grid}-${season}-${round}` com
 * `{ file, gpSlug }` quando o PNG existe — `null` caso ainda não
 * tenha rodado o Action ou a etapa não esteja na lista.
 */
const cache = { data: null, loadedAt: 0, promise: null };
const TTL_MS = 60 * 1000;

const fetchManifest = async () => {
    try {
        const res = await fetch(`/highlights/top10-manifest.json?_=${Date.now()}`, {
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json || !Array.isArray(json.stages)) return null;
        return json;
    } catch {
        return null;
    }
};

export function useTop10Manifest() {
    const [manifest, setManifest] = useState(() => {
        if (cache.data && Date.now() - cache.loadedAt < TTL_MS) return cache.data;
        return null;
    });

    useEffect(() => {
        let alive = true;
        const now = Date.now();
        if (cache.data && now - cache.loadedAt < TTL_MS) {
            setManifest(cache.data);
            return () => { alive = false; };
        }
        if (!cache.promise) {
            cache.promise = fetchManifest().then((data) => {
                cache.data = data;
                cache.loadedAt = Date.now();
                cache.promise = null;
                return data;
            });
        }
        cache.promise.then((data) => {
            if (alive) setManifest(data);
        });
        return () => { alive = false; };
    }, []);

    return manifest;
}

/**
 * Devolve o caminho público do PNG para uma etapa específica, ou null
 * se ainda não foi gerado.
 */
export function getTop10PngPath(manifest, { grid, season, round }) {
    if (!manifest?.stages?.length) return null;
    const item = manifest.stages.find((s) =>
        s.grid === grid &&
        Number(s.season) === Number(season) &&
        Number(s.round) === Number(round)
    );
    return item?.file || null;
}
