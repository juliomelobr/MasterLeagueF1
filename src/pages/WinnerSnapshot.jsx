import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';
import WinnerArt, { computeWinnerArtData } from '../components/WinnerArt';
import './GeradorVencedor.css';

/**
 * Rota Playwright: /snapshot/winner/:grid/:season/:round
 */
export default function WinnerSnapshot() {
    const { grid, season, round } = useParams();
    const { rawCarreira, rawLight, tracks, loading } = useLeagueData();
    const [imagesReady, setImagesReady] = useState(false);

    const rawData = grid === 'carreira' ? rawCarreira : rawLight;
    const data = useMemo(
        () => computeWinnerArtData({ rawData, season, round, tracks, gridType: grid }),
        [rawData, season, round, tracks, grid],
    );

    const dataReady = !loading && data.hasWinner;

    useEffect(() => {
        if (!dataReady) return undefined;
        let cancelled = false;

        const waitForImages = async () => {
            try {
                if (document.fonts?.ready) await document.fonts.ready;
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
                /* segue */
            }
            if (!cancelled) setImagesReady(true);
        };

        waitForImages();
        return () => { cancelled = true; };
    }, [dataReady]);

    useEffect(() => {
        if (!imagesReady) {
            document.body.removeAttribute('data-snapshot-ready');
            return undefined;
        }
        const id = window.setTimeout(() => {
            document.body.setAttribute('data-snapshot-ready', 'true');
        }, 250);
        return () => {
            window.clearTimeout(id);
            document.body.removeAttribute('data-snapshot-ready');
        };
    }, [imagesReady]);

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
                style={{ width: 1080, height: 1350, background: '#03060f' }}
            />
        );
    }

    return (
        <div
            id="winner-snapshot-stage"
            style={{
                width: 1080,
                height: 1350,
                background: '#03060f',
                position: 'relative',
                margin: 0,
                padding: 0,
            }}
        >
            <WinnerArt
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
