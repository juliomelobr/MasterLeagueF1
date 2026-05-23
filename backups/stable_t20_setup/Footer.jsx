import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer>
            <div className="nav-logo" style={{display:'flex', justifyContent:'center', marginBottom:'10px'}}>
                MASTER <span>LEAGUE</span>
            </div>
            
            <div className="footer-social" style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
                <a href="https://www.instagram.com/ml1oficial/" target="_blank" rel="noopener noreferrer" className="social-icon-link" title="Instagram">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                </a>
                <a href="https://chat.whatsapp.com/K3UKMSXPoZv8BaYSMGRCuK" target="_blank" rel="noopener noreferrer" className="social-icon-link" title="WhatsApp">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-13.5 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
                    </svg>
                </a>
                <Link to="/dashboard/escolher-tipo" className="social-icon-link" title="Motorhome">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </Link>
            </div>

            <p style={{color:'#94A3B8'}}>© 2025. Acelere para a glória.</p>
            <Link to="/admin" style={{fontSize: '0.7rem', color: '#334155', textDecoration: 'none', marginTop: '20px', display: 'block'}}>Área Administrativa</Link>
        </footer>
    );
};

export default Footer;

