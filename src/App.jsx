import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DisableAutoScroll from './components/DisableAutoScroll';

// Lazy load das páginas — cada rota vira um chunk separado e só carrega ao acessar
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const LoginJurado = lazy(() => import('./pages/LoginJurado'));
const LoginJuradoTeste = lazy(() => import('./pages/LoginJuradoTeste'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PowerRanking = lazy(() => import('./pages/PowerRanking'));
const HistoricoPowerRanking = lazy(() => import('./pages/HistoricoPowerRanking'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const Regulamento = lazy(() => import('./pages/Regulamento'));
const Telemetria = lazy(() => import('./pages/Telemetria'));
const Standings = lazy(() => import('./pages/Standings'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminSync = lazy(() => import('./pages/AdminSync'));
const AdminDraftImport = lazy(() => import('./pages/AdminDraftImport'));
const AdminPowerRanking = lazy(() => import('./pages/AdminPowerRanking'));
const Calendario = lazy(() => import('./pages/Calendario'));
const ConsultarAnalises = lazy(() => import('./pages/ConsultarAnalises'));
const FormularioAcusacao = lazy(() => import('./pages/FormularioAcusacao'));
const FormularioDefesa = lazy(() => import('./pages/FormularioDefesa'));
const PainelVeredito = lazy(() => import('./pages/PainelVeredito'));
const Minicup = lazy(() => import('./pages/Minicup'));
const PilotoAtivoOuEx = lazy(() => import('./pages/PilotoAtivoOuEx'));
const ExPilotoCadastro = lazy(() => import('./pages/ExPilotoCadastro'));
const ExPilotoLogin = lazy(() => import('./pages/ExPilotoLogin'));
const ExPilotoEscolha = lazy(() => import('./pages/ExPilotoEscolha'));
const ResultadosCorrida = lazy(() => import('./pages/ResultadosCorrida'));
const Noticias = lazy(() => import('./pages/Noticias'));
const Narrador = lazy(() => import('./pages/Narrador'));
const Cards = lazy(() => import('./pages/Cards'));
const CardsCarousel = lazy(() => import('./pages/CardsCarousel'));
const PowerRankingObjetivos = lazy(() => import('./pages/PowerRankingObjetivos'));
const Inscricao = lazy(() => import('./pages/Inscricao'));
const MotorhomeMaster = lazy(() => import('./pages/MotorhomeMaster'));
const GeradorTop10 = lazy(() => import('./pages/GeradorTop10'));
const GeradorVencedor = lazy(() => import('./pages/GeradorVencedor'));
const Top10Snapshot = lazy(() => import('./pages/Top10Snapshot'));
const Top10SnapshotList = lazy(() => import('./pages/Top10SnapshotList'));
const WinnerSnapshot = lazy(() => import('./pages/WinnerSnapshot'));
const WinnerSnapshotList = lazy(() => import('./pages/WinnerSnapshotList'));

// Fallback enquanto a página lazy carrega
const PageFallback = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: '#94A3B8',
        fontSize: '1rem',
        fontWeight: 600
    }}>
        Carregando…
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <DisableAutoScroll />
            <Navbar />
            <Suspense fallback={<PageFallback />}>
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
                    <Route path="/admin/top10-artes" element={<GeradorTop10 />} />
                    <Route path="/admin/vencedor-artes" element={<GeradorVencedor />} />
                    {/* Rotas usadas pelo Playwright/GitHub Action para gerar
                        os PNGs de TOP 10 servidos em public/highlights/. */}
                    <Route path="/snapshot/top10/list" element={<Top10SnapshotList />} />
                    <Route path="/snapshot/top10/:grid/:season/:round" element={<Top10Snapshot />} />
                    <Route path="/snapshot/winner/list" element={<WinnerSnapshotList />} />
                    <Route path="/snapshot/winner/:grid/:season/:round" element={<WinnerSnapshot />} />
                    <Route path="/standings" element={<Standings />} />
                    <Route path="/powerranking" element={<PowerRanking />} />
                    <Route path="/historicopowerranking" element={<HistoricoPowerRanking />} />
                    <Route path="/halloffame" element={<HallOfFame />} />
                    <Route path="/regulamento" element={<Regulamento />} />
                    <Route path="/telemetria" element={<Telemetria />} />
                    <Route path="/etapas" element={<Calendario />} />
                    <Route path="/calendario" element={<Calendario />} />
                    <Route path="/analises" element={<ConsultarAnalises />} />
                    <Route path="/acusacao" element={<FormularioAcusacao />} />
                    <Route path="/defesa" element={<FormularioDefesa />} />
                    <Route path="/veredito" element={<PainelVeredito />} />
                    <Route path="/minicup" element={<Minicup />} />
                    <Route path="/resultados-corrida" element={<ResultadosCorrida />} />
                    <Route path="/noticias" element={<Noticias />} />
                    <Route path="/narrador" element={<Narrador />} />
                    <Route path="/cards" element={<Cards />} />
                    <Route path="/cards-carousel" element={<CardsCarousel />} />
                    <Route path="/admin/powerranking-objetivos" element={<PowerRankingObjetivos />} />
                    <Route path="/inscricao" element={<Inscricao />} />
                    <Route path="/motorhome-master" element={<MotorhomeMaster />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
