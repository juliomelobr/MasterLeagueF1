import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar'; // Importando o Menu
import DisableAutoScroll from './components/DisableAutoScroll'; // Desabilitar scroll automático

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import LoginJurado from './pages/LoginJurado';
import LoginJuradoTeste from './pages/LoginJuradoTeste';
import Dashboard from './pages/Dashboard';
import PowerRanking from './pages/PowerRanking';
import HallOfFame from './pages/HallOfFame';
import Regulamento from './pages/Regulamento';
import Telemetria from './pages/Telemetria';
import Standings from './pages/Standings';
import Admin from './pages/Admin';
import AdminSync from './pages/AdminSync';
import AdminDraftImport from './pages/AdminDraftImport';
import AdminPowerRanking from './pages/AdminPowerRanking';
import Calendario from './pages/Calendario';
import Analises from './pages/Analises';
import ConsultarAnalises from './pages/ConsultarAnalises';
import FormularioAcusacao from './pages/FormularioAcusacao';
import FormularioDefesa from './pages/FormularioDefesa';
import PainelVeredito from './pages/PainelVeredito';
import Minicup from './pages/Minicup';
import PilotoAtivoOuEx from './pages/PilotoAtivoOuEx';
import ExPilotoCadastro from './pages/ExPilotoCadastro';
import ExPilotoLogin from './pages/ExPilotoLogin';
import ExPilotoEscolha from './pages/ExPilotoEscolha';
import ResultadosCorrida from './pages/ResultadosCorrida';
import Noticias from './pages/Noticias';
// import Narrador from './pages/Narrador'; // ADIADO - Sistema de narrador

function App() {
    return (
        <BrowserRouter>
            <DisableAutoScroll />
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login-jurado" element={<LoginJurado />} />
                <Route path="/login-jurado-teste" element={<LoginJuradoTeste />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/escolher-tipo" element={<PilotoAtivoOuEx />} />
                <Route path="/ex-piloto/escolha" element={<ExPilotoEscolha />} />
                <Route path="/ex-piloto/cadastro" element={<ExPilotoCadastro />} />
                <Route path="/ex-piloto/login" element={<ExPilotoLogin />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/sync" element={<AdminSync />} />
                <Route path="/admin/draft-import" element={<AdminDraftImport />} />
                <Route path="/admin/power-ranking" element={<AdminPowerRanking />} />
                {/* <Route path="/narrador" element={<Narrador />} /> */} {/* ADIADO - Sistema de narrador */}
                <Route path="/standings" element={<Standings />} />
                <Route path="/powerranking" element={<PowerRanking />} />
                <Route path="/halloffame" element={<HallOfFame />} />
                <Route path="/regulamento" element={<Regulamento />} />
                <Route path="/telemetria" element={<Telemetria />} />
                <Route path="/etapas" element={<Calendario />} />
                <Route path="/analises" element={<ConsultarAnalises />} />
                <Route path="/acusacao" element={<FormularioAcusacao />} />
                <Route path="/defesa" element={<FormularioDefesa />} />
                <Route path="/veredito" element={<PainelVeredito />} />
                <Route path="/minicup" element={<Minicup />} />
                <Route path="/resultados-corrida" element={<ResultadosCorrida />} />
                <Route path="/noticias" element={<Noticias />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
