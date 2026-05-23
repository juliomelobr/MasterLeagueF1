import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer>
            <div className="nav-logo" style={{display:'flex', justifyContent:'center', marginBottom:'10px'}}>
                MASTER <span>LEAGUE</span>
            </div>
            
            <div className="footer-social">
                <a href="https://www.instagram.com/masterleaguef1?utm_source=qr&igsh=MTBpYndzNHh6NXlsYQ==" target="_blank" rel="noopener noreferrer" className="social-icon-link instagram" title="Instagram">
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
                    </svg>
                </a>
                <a href="https://chat.whatsapp.com/K3UKMSXPoZv8BaYSMGRCuK" target="_blank" rel="noopener noreferrer" className="social-icon-link whatsapp" title="WhatsApp">
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M20.52 3.48A11.94 11.94 0 0 0 12.02 0C5.7.02.56 5.17.55 11.49c0 2.02.52 3.99 1.51 5.73L.02 24l6.94-2a11.44 11.44 0 0 0 5.05 1.21h.02c6.32 0 11.46-5.14 11.48-11.46a11.38 11.38 0 0 0-3-8.27Zm-8.5 17.1h-.02a9.55 9.55 0 0 1-4.84-1.32l-.35-.21-4.12 1.18 1.1-4.02-.23-.38a9.43 9.43 0 0 1-1.44-5.2C2.13 6.05 6.6 1.58 12 1.58c2.55 0 4.94.99 6.74 2.8a9.38 9.38 0 0 1 2.78 6.7c-.02 5.4-4.49 9.48-9.5 9.5Zm5.2-7.32c-.28-.14-1.67-.82-1.93-.91-.26-.1-.45-.14-.64.14-.19.27-.74.91-.9 1.1-.17.2-.33.21-.6.07-.27-.14-1.14-.42-2.17-1.33-.8-.71-1.34-1.58-1.5-1.84-.16-.27-.02-.42.12-.56.13-.13.27-.33.4-.5.13-.16.17-.28.25-.47.08-.19.04-.36-.02-.5-.06-.13-.56-1.35-.77-1.86-.2-.48-.4-.42-.56-.43-.14-.01-.32-.02-.5-.02-.19 0-.5.07-.76.34-.26.27-.99.97-.99 2.36 0 1.39 1.01 2.73 1.15 2.92.14.19 2.2 3.47 5.36 4.71.75.3 1.33.48 1.78.62.75.24 1.43.2 1.96.12.6-.09 1.86-.76 2.12-1.49.26-.74.26-1.38.18-1.49-.08-.11-.3-.18-.62-.33Z"/>
                    </svg>
                </a>
                <Link to="/dashboard/escolher-tipo" className="social-icon-link motorhome" title="Motorhome">
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 9l9-7 9 7v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H9v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </Link>
            </div>

            <p style={{color:'#94A3B8'}}>© 2026. Acelere para a glória.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '20px' }}>
                <Link to="/admin" style={{ fontSize: '0.7rem', color: '#334155', textDecoration: 'none' }}>
                    Área Administrativa
                </Link>
                <Link to="/narrador" style={{ fontSize: '0.7rem', color: '#334155', textDecoration: 'none' }}>
                    Área Narrador
                </Link>
            </div>
        </footer>
    );
};

export default Footer;

