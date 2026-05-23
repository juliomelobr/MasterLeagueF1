# 📝 Changelog - Master League F1

## [2025-12-15] - Sistema de Narradores, Hero Banner Personalizado e YouTube Shorts

### ✨ Novas Funcionalidades

#### Sistema de Narradores
- ✅ Criada tabela `narradores` no Supabase
- ✅ Página `/narrador` para acesso dos narradores
- ✅ Login com email e senha (hash SHA-256)
- ✅ Visualização somente leitura dos painéis dos pilotos
- ✅ Filtros por nome, equipe e grid
- ✅ Página de cadastro no admin (`/admin` - aba Narradores)
- ✅ Gerenciamento completo (criar, editar, ativar/desativar, excluir)
- ✅ Link na Home abaixo do link do Admin

#### Hero Banner Personalizado
- ✅ Hero banner personalizado por equipe do piloto
- ✅ Mapeamento de equipes para wallpapers de F1
- ✅ Suporte a todas as equipes da F1 (Red Bull, Ferrari, Mercedes, McLaren, etc.)
- ✅ Wallpaper padrão para pilotos sem equipe
- ✅ Gradiente dinâmico baseado na cor da equipe
- ✅ Efeito parallax com `backgroundAttachment: 'fixed'`
- ✅ Pasta `public/wallpapers/` criada para armazenar imagens

#### Suporte a YouTube Shorts
- ✅ Detecção automática de YouTube Shorts
- ✅ Layout otimizado para formato vertical (9:16)
- ✅ Altura ajustada para 600px para Shorts
- ✅ Container centralizado com largura máxima de 400px
- ✅ Vídeos normais mantêm formato 16:9 padrão

### 🔧 Melhorias
- ✅ Dashboard agora aceita props `isReadOnly` e `pilotoEmail` para modo narrador
- ✅ Função `getTeamWallpaper()` adicionada ao Dashboard
- ✅ Regex de YouTube atualizado para detectar `/shorts/`
- ✅ Componente `VideoEmbed` com layout adaptativo

### 📁 Arquivos Criados
- `src/pages/Narrador.jsx` - Página do narrador
- `supabase-schema-narradores.sql` - Schema SQL para narradores
- `public/wallpapers/README.md` - Instruções para wallpapers

### 📝 Arquivos Modificados
- `src/pages/Dashboard.jsx` - Hero banner personalizado e suporte a modo narrador
- `src/pages/Admin.jsx` - Aba Narradores adicionada
- `src/pages/Home.jsx` - Link para área do narrador
- `src/App.jsx` - Rota `/narrador` adicionada
- `src/utils/videoEmbed.js` - Suporte a YouTube Shorts
- `src/components/VideoEmbed.jsx` - Layout adaptativo para Shorts
- `ESTADO_ATUAL_PROJETO.md` - Documentação atualizada

---

## [2025-01-13] - Sistema de Autenticação 2FA via WhatsApp

### ✨ Novas Funcionalidades
- ✅ Sistema completo de autenticação 2FA via WhatsApp
- ✅ Persistência via localStorage
- ✅ Sincronização automática de pilotos da planilha
- ✅ Sistema de ex-pilotos com fluxo completo

### 🔧 Melhorias
- ✅ Edge Function `send-whatsapp-code` com suporte a Twilio e Z-API
- ✅ RLS policies corrigidas para WhatsApp codes
- ✅ Fluxo de login otimizado

---

## Histórico Anterior
- Sistema de análises (acusações, defesas, vereditos)
- Sistema de cache Supabase
- Painel administrativo
- Integração com Google Sheets
