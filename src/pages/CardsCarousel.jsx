import { useMemo, useState } from 'react';
import './Cards.css';
import './CardsCarousel.css';

const DriverImage = ({ name, gridType, season }) => {
    const cleanName = name
        ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase()
        : "pilotoshadow";
    const s = season || '20';

    const seasonSrc = `/pilotos/${gridType || 'carreira'}/s${s}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const fallbackS19Src = `/pilotos/${gridType || 'carreira'}/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';

    const handleError = (e) => {
        if (e.target.src.includes(`/s${s}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            if (!e.target.src.includes(`/s19/`)) e.target.src = fallbackS19Src;
            else e.target.src = shadowSrc;
        } else if (e.target.src.includes(`/s19/`)) {
            e.target.src = shadowSrc;
        }
    };

    const initialSrc = smlSrc;
    return <img src={initialSrc} onError={handleError} alt={name || ''} />;
};

function CardsCarousel() {
    const cards = useMemo(() => ([
        {
            name: 'Alexandre Henrique',
            grid: 'carreira',
            stats: { power: 90, overall: 77, performance: 94, racecraft: 88, conduta: 100, historico: 86 }
        },
        {
            name: 'Julio Melo',
            grid: 'light',
            stats: { power: 91, overall: 76, performance: 95, racecraft: 94, conduta: 100, historico: 84 }
        },
        {
            name: 'Ricardo Wielewski',
            grid: 'light',
            stats: { power: 87, overall: 74, performance: 90, racecraft: 86, conduta: 98, historico: 79 }
        },
        {
            name: 'Alann Rodrigues',
            grid: 'light',
            stats: { power: 85, overall: 72, performance: 89, racecraft: 84, conduta: 97, historico: 77 }
        },
        {
            name: 'Andrey Brauer',
            grid: 'carreira',
            stats: { power: 92, overall: 79, performance: 96, racecraft: 92, conduta: 99, historico: 88 }
        }
    ]), []);

    const [activeIndex, setActiveIndex] = useState(0);

    const prev = () => setActiveIndex((idx) => (idx - 1 + cards.length) % cards.length);
    const next = () => setActiveIndex((idx) => (idx + 1) % cards.length);

    return (
        <div className="cards-carousel-page">
            <div className="cards-carousel">
                <button className="carousel-nav left" onClick={prev} aria-label="Anterior">‹</button>
                <div className="carousel-stage">
                    {cards.map((card, index) => {
                        const offset = index - activeIndex;
                        const abs = Math.abs(offset);
                        if (abs > 3) return null;

                        const style = {
                            transform: `translateX(${offset * 140}px) translateZ(${-abs * 80}px) rotateY(${offset * -12}deg) scale(${1 - abs * 0.08})`,
                            opacity: 1 - abs * 0.2,
                            zIndex: 10 - abs
                        };

                        return (
                            <div
                                key={card.name}
                                className={`carousel-card ${offset === 0 ? 'active' : ''}`}
                                style={style}
                                onClick={() => setActiveIndex(index)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="driver-card">
                                    <div className="card-bg-layer"></div>
                                    <div className="driver-photo">
                                        <DriverImage name={card.name} gridType={card.grid} season={20} />
                                    </div>
                                    <div className="card-front-layer"></div>
                                    <div className="card-info-overlay">
                                        <div className="card-pr-badge stat-pr">
                                            <span className="label">POWER RANKING</span>
                                            <span className="value main-pr">{card.stats.power}</span>
                                        </div>
                                        <div className="card-stat-row overall stat-overall">
                                            <span className="label">OVERALL</span>
                                            <span className="value">{card.stats.overall}</span>
                                        </div>
                                        <div className="card-stat-row stat-performance">
                                            <span className="label">PERFORMANCE</span>
                                            <span className="value">{card.stats.performance}</span>
                                        </div>
                                        <div className="card-stat-row stat-racecraft">
                                            <span className="label">RACECRAFT</span>
                                            <span className="value">{card.stats.racecraft}</span>
                                        </div>
                                        <div className="card-stat-row stat-conduta">
                                            <span className="label">CONDUTA</span>
                                            <span className="value">{card.stats.conduta}</span>
                                        </div>
                                        <div className="card-stat-row stat-historico">
                                            <span className="label">HISTÓRICO</span>
                                        </div>
                                    </div>
                                    <div className="historico-value">{card.stats.historico}</div>
                                    <div className="card-name-block">
                                        <div className="driver-name">
                                            {card.name.split(' ')[0]}<br />
                                            <span>{card.name.split(' ').slice(1).join(' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button className="carousel-nav right" onClick={next} aria-label="Próximo">›</button>
            </div>
        </div>
    );
}

export default CardsCarousel;
