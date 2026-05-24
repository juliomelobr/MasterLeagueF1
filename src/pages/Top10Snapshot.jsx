import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';
import Top10Art, { computeTop10ArtData } from '../components/Top10Art';
import './GeradorTop10.css';

/**
 * Página dedicada para o Playwright (GitHub Action) tirar screenshot da
 * arte do TOP 10 sem nenhuma UI ao redor. Renderiza em escala 1:1
 * (1080×1500) e marca `body[data-snapshot-ready="true"]` quando todas as
 * fontes e imagens já estão pintadas.
 *
 * Rota: /snapshot/top10/:grid/:season/:round
 */
export default function Top10Snapshot() {
    const { grid, season, round } = useParams();
    const { rawCarreira, rawLight, tracks, loading } = useLeagueData();
    const [imagesReady, setImagesReady] = useState(false);

    const rawData = grid === 'carreira' ? rawCarreira : rawLight;

    const data = useMemo(
        () => computeTop10ArtData({
            rawData,
            season,
            round,
            tracks,
            gridType: grid,
        }),
        [rawData, season, round, tracks, grid],
    );

    const dataReady = !loading && data.raceResults.length >= 10;

    useEffect(() => {
        if (!dataReady) return undefined;
        let cancelled = false;

        const waitForImages = async () => {
            try {
                if (document.fonts?.ready) {
                    await document.fonts.ready;
                }
                if (cancelled) return;
                const images = Array.from(document.images || []);
                await Promise.all(
                    images.map((img) => {
                        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                        return new Promise((resolve) => {
                            const done = () => resolve();
                            img.addEventListener('load', done, { once: true });
                            img.addEventListener('error', done, { once: true });
                        });
                    }),
                );
            } catch {
                // segue mesmo com erro
            }
            if (cancelled) return;
            setImagesReady(true);
        };

        waitForImages();
        return () => { cancelled = true; };
    }, [dataReady]);

    useEffect(() => {
        if (!imagesReady) {
            document.body.removeAttribute('data-snapshot-ready');
            return undefined;
        }
        // Pequena pausa para garantir que filtros, gradientes e mix-blend
        // já terminaram de pintar antes do screenshot.
        const id = window.setTimeout(() => {
            document.body.setAttribute('data-snapshot-ready', 'true');
        }, 250);
        return () => {
            window.clearTimeout(id);
            document.body.removeAttribute('data-snapshot-ready');
        };
    }, [imagesReady]);

    // Estilos no body para garantir fundo correto e remover scroll/margens.
    useEffect(() => {
        const previous = {
            margin: document.body.style.margin,
            padding: document.body.style.padding,
            background: document.body.style.background,
            overflow: document.body.style.overflow,
        };
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.background = '#03060f';
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.margin = previous.margin;
            document.body.style.padding = previous.padding;
            document.body.style.background = previous.background;
            document.body.style.overflow = previous.overflow;
        };
    }, []);

    if (!dataReady) {
        return (
            <div
                data-snapshot-loading="true"
                style={{ width: 1080, height: 1500, background: '#03060f' }}
            />
        );
    }

    return (
        <div
            id="top10-snapshot-stage"
            style={{
                width: 1080,
                height: 1500,
                background: '#03060f',
                position: 'relative',
                margin: 0,
                padding: 0,
            }}
        >
            <Top10Art
                gridType={grid}
                season={season}
                round={round}
                rawData={rawData}
                tracks={tracks}
                format="feed"
                scale={1}
            />
        </div>
    );
}
