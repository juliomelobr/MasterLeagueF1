import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
import Home from './pages/Home';
import Analises from './pages/Analises';
import Minicup from './pages/Minicup';
import HallDaFama from './pages/HallDaFama';

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/analises" element={<Analises />} />
                <Route path="/minicup" element={<Minicup />} />
                <Route path="/halldafama" element={<HallDaFama />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

// HallDaFama.jsx
// ...existing code...

// Procure pela seção "MÁQUINA DE PÓDIOS" e altere para:
<div className="hall-label">SOMELIER DE PÓDIOS</div>

// OU se estiver como título/heading:
<h3>SOMELIER DE PÓDIOS</h3>

// ...existing code...