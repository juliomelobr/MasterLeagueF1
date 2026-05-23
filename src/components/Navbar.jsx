import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleHomeNav = (view) => {
        setIsMenuOpen(false);
        navigate(`/?view=${view}`);
    };

    const getActive = (viewName) => {
        const params = new URLSearchParams(location.search);
        const currentView = params.get('view') || 'hub';
        if (location.pathname !== '/') return '';
        return currentView === viewName ? 'active' : '';
    };

    const getActiveRoute = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="navbar">
            {/* LOGO E NOME ALINHADOS */}
            <div 
                className="nav-logo" 
                onClick={() => handleHomeNav('hub')} 
                style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer'
                }}
            >
                {/* Logo carregada da pasta public/logos */}
                <img 
                    src="/team-logos/logo-ml.png" 
                    alt="Logo Master League" 
                    style={{height: '40px', width: 'auto', objectFit: 'contain'}}
                    onError={(e) => e.target.style.display = 'none'}
                />
                <div>MASTER <span>LEAGUE</span></div>
            </div>
            
            <button className="mobile-menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
            
            <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                {/* Botões da Home */}
                <button className={`nav-link-btn ${getActive('hub')}`} onClick={() => handleHomeNav('hub')}>INÍCIO</button>
                <button className={`nav-link-btn ${getActive('drivers')}`} onClick={() => handleHomeNav('drivers')}>CLASSIFICAÇÃO</button>
                
                {/* Botões de Páginas */}
                <Link to="/etapas" className={`nav-link-btn ${getActiveRoute('/etapas')}`} onClick={() => setIsMenuOpen(false)}>CALENDÁRIO</Link>
                <Link to="/analises" className={`nav-link-btn ${getActiveRoute('/analises')}`} onClick={() => setIsMenuOpen(false)}>ANÁLISES</Link>
                <Link to="/telemetria" className={`nav-link-btn ${getActiveRoute('/telemetria')}`} onClick={() => setIsMenuOpen(false)}>TELEMETRIA</Link>
                <Link to="/regulamento" className={`nav-link-btn ${getActiveRoute('/regulamento')}`} onClick={() => setIsMenuOpen(false)}>REGULAMENTO</Link>
                <Link to="/halloffame" className={`nav-link-btn ${getActiveRoute('/halloffame')}`} onClick={() => setIsMenuOpen(false)}>HALL DA FAMA</Link>
                <Link to="/powerranking" className={`nav-link-btn ${getActiveRoute('/powerranking')}`} style={{color:'#FFD700'}} onClick={() => setIsMenuOpen(false)}>POWER RANKING</Link>
                <Link to="/inscricao" className={`nav-link-btn ${getActiveRoute('/inscricao')}`} onClick={() => setIsMenuOpen(false)}>INSCRIÇÃO</Link>
                
                <Link to="/dashboard/escolher-tipo" className="btn-login" onClick={() => setIsMenuOpen(false)}>MOTORHOME</Link>
            </div>
        </nav>
    );
}

export default Navbar;