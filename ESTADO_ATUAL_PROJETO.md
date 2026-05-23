# 📋 Estado Atual do Projeto - Master League F1

**Data:** 15/12/2025  
**Última Atualização:** Sistema de narradores, hero banner personalizado por equipe, suporte a YouTube Shorts

---

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

### 1. Sistema de Cache Supabase (CONCLUÍDO)
- ✅ Tabelas de cache criadas no Supabase:
  - `classificacao_cache` (Carreira e Light)
  - `power_ranking_cache`
  - `calendario_cache`
  - `tracks_cache`
  - `minicup_cache`
  - `sync_log`

- ✅ Edge Functions criadas:
  - `sync-google-sheets`: Sincroniza dados do Google Sheets para Supabase
  - `sync-scheduler`: Orquestra sincronizações automáticas

- ✅ Hook `useSupabaseCache` criado:
  - Busca do Supabase primeiro
  - Fallback automático para Google Sheets
  - Cache local (localStorage) como último recurso
  - Tratamento de problemas de timezone

- ✅ Páginas usando Supabase:
  - `Home.jsx`: Minicup carrossel → Supabase ✅
  - `Minicup.jsx`: Tabela completa → Supabase ✅
  - `useLeagueData.js`: Classificação, Tracks, Power Ranking → Supabase ✅
  - `PowerRanking.jsx`: Atualizado para usar `usePowerRankingCache` ✅

### 2. Sistema de Análises (CONCLUÍDO)
- ✅ Sistema completo de acusações, defesas e vereditos
- ✅ Tabelas no Supabase:
  - `lances` - Registro de lances polêmicos
  - `acusacoes` - Acusações de pilotos
  - `defesas` - Defesas dos acusados
  - `verdicts` - Vereditos dos stewards
  - `email_log` - Log de emails enviados
  - `notificacoes_admin` - Notificações para admins

- ✅ Funcionalidades:
  - Formulários de acusação e defesa
  - Suporte a múltiplas plataformas de vídeo (YouTube, Vimeo, Google Drive, etc.)
  - Sistema de deadlines (Light Grid)
  - Cálculo automático de penalidades
  - Envio automático de emails
  - Painel de stewards para emitir vereditos

### 3. Painel Administrativo (CONCLUÍDO)
- ✅ Painel admin (`/admin`)
  - ✅ Edição de usuários/pilotos (nome, email, grid, equipe, whatsapp, gamertag, is_steward)
  - ✅ Aprovação e reset de usuários
  - ✅ Gerenciamento de jurados
  - ✅ Notificações de acusações
  - ✅ Visualização de pilotos cadastrados (tabela `pilotos`)
  - ✅ Sincronização de edições para Supabase (tabela `pilotos`)

### 4. Sistema de Autenticação 2FA via WhatsApp (✅ CONCLUÍDO E FUNCIONAL)

#### ✅ Backend Implementado:
- ✅ Tabela `whatsapp_verification_codes` criada no Supabase
  - Armazena códigos de verificação de 6 dígitos
  - Expiração de 10 minutos
  - Controle de tentativas e uso
  - RLS policies configuradas e corrigidas

- ✅ Edge Function `send-whatsapp-code` criada e deployada
  - Gera código de 6 dígitos
  - Formata números de telefone (remove máscaras, adiciona código do país)
  - Suporta múltiplas APIs: **Twilio** (padrão) e **Z-API** (fallback)
  - Valida piloto na tabela `pilotos`
  - Atualiza WhatsApp do piloto se necessário
  - Logs detalhados para debugging
  - Invalida códigos anteriores antes de criar novo

- ✅ Utilitário `src/utils/whatsappAuth.js` criado
  - `requestVerificationCode()` - Solicita código via Edge Function
  - `verifyCode()` - Valida código digitado
  - Tratamento robusto de erros (respostas não-JSON)
  - Uso de `supabase.functions.invoke()` para garantir URL correta

#### ✅ Frontend Implementado:
- ✅ `src/pages/Login.jsx` com fluxo completo:
  - **Estado 1:** Login com Google OAuth
  - **Estado 2:** Verificação de email na tabela `pilotos` (Supabase)
  - **Estado 3:** Se não encontrado, busca na planilha Google Sheets e sincroniza automaticamente
  - **Estado 4:** Solicitação de WhatsApp (campo sempre vazio, piloto precisa digitar)
  - **Estado 5:** Validação de WhatsApp (compara com planilha/Supabase)
  - **Estado 6:** Envio de código via Edge Function
  - **Estado 7:** Validação de código (até 3 tentativas)
  - **Estado 8:** Redirecionamento para Dashboard após sucesso
  - **Estado 9:** Formulário de inscrição manual (se email não encontrado ou após 3 tentativas)

- ✅ `src/pages/Dashboard.jsx` protegido:
  - Verifica se piloto tem WhatsApp cadastrado
  - Redireciona para `/login` se não tiver
  - Limpa localStorage no logout explícito

- ✅ **Persistência de 2FA via localStorage:**
  - Após validação bem-sucedida, salva `localStorage["ml_pilot_2fa_ok:<email>"] = "true"`
  - Próximos acessos no mesmo navegador/dispositivo não pedem código novamente
  - Flag é limpa apenas no logout explícito (botão "SAIR")
  - Cada navegador/dispositivo precisa validar separadamente (mais seguro)

#### ✅ Sincronização Automática:
- ✅ `src/utils/syncPilotosFromSheet.js`:
  - `syncPilotosFromSheet()` - Sincroniza todos os pilotos da planilha
  - `findDriverByEmail(email)` - Busca piloto específico na planilha
  - `findAndSyncPilotoFromSheet(email)` - Busca e sincroniza piloto específico automaticamente
  - Mapeamento correto de colunas (Coluna H = E-mail Login)

#### ✅ Configuração:
- ✅ Conta Twilio configurada e funcionando
- ✅ WhatsApp Sandbox configurado
- ✅ Secrets do Twilio no Supabase configurados:
  - `WHATSAPP_API_TYPE` = `twilio`
  - `TWILIO_ACCOUNT_SID` = (configurado)
  - `TWILIO_AUTH_TOKEN` = (configurado)
  - `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886`
- ✅ Z-API mantido como fallback (basta mudar `WHATSAPP_API_TYPE` para `z-api`)

#### ✅ Testes Realizados:
- ✅ Edge Function testada e funcionando
- ✅ Mensagens chegando no WhatsApp via Twilio
- ✅ Validação de código funcionando
- ✅ Persistência de 2FA funcionando (não pede código novamente após validação)
- ✅ Logout limpa localStorage corretamente
- ✅ Sincronização automática de pilotos funcionando

### 5. Sistema de Ex-Pilotos (CONCLUÍDO)
- ✅ Fluxo completo de cadastro e login para ex-pilotos
- ✅ Tabela `pilotos` com campo `tipo_piloto` ('ativo' ou 'ex-piloto')
- ✅ Status 'pendente' para aprovação pelo admin
- ✅ Dashboard somente leitura para ex-pilotos
- ✅ Sistema de aprovação via admin com notificação WhatsApp
- ✅ Criação de senha após aprovação
- ✅ Biografia e histórico do piloto no dashboard
- ✅ Exibição de status ATIVO/INATIVO baseado na planilha "Pilotos PR"

### 6. Sistema de Narradores (CONCLUÍDO)
- ✅ Tabela `narradores` criada no Supabase
- ✅ Página `/narrador` para acesso dos narradores
- ✅ Login com email e senha (hash SHA-256)
- ✅ Visualização somente leitura dos painéis dos pilotos
- ✅ Filtros por nome, equipe e grid
- ✅ Página de cadastro no admin (`/admin` - aba Narradores)
- ✅ Gerenciamento completo (criar, editar, ativar/desativar, excluir)
- ✅ Link na Home abaixo do link do Admin

### 7. Hero Banner Personalizado (CONCLUÍDO)
- ✅ Hero banner personalizado por equipe do piloto
- ✅ Mapeamento de equipes para wallpapers de F1
- ✅ Suporte a todas as equipes da F1 (Red Bull, Ferrari, Mercedes, McLaren, etc.)
- ✅ Wallpaper padrão para pilotos sem equipe
- ✅ Gradiente dinâmico baseado na cor da equipe
- ✅ Efeito parallax com `backgroundAttachment: 'fixed'`
- ✅ Pasta `public/wallpapers/` criada para armazenar imagens

### 8. Suporte a YouTube Shorts (CONCLUÍDO)
- ✅ Detecção automática de YouTube Shorts
- ✅ Layout otimizado para formato vertical (9:16)
- ✅ Altura ajustada para 600px para Shorts
- ✅ Container centralizado com largura máxima de 400px
- ✅ Vídeos normais mantêm formato 16:9 padrão

### 9. Funcionalidades Principais
- ✅ Sistema de login com Google OAuth
- ✅ Painel do piloto (`/dashboard`)
- ✅ Custom Alert/Confirm dialogs
- ✅ Suporte a múltiplas plataformas de vídeo (incluindo YouTube Shorts)

---

## 🔄 TAREFAS PENDENTES

### 1. Melhorias no Sistema 2FA (BAIXA PRIORIDADE)
**Status:** Funcional, melhorias opcionais  
**Tempo estimado:** 1-2 horas

**Sub-tarefas:**
- [ ] Adicionar timer de reenvio de código (ex: "Reenviar código em 60s")
- [ ] Melhorar mensagens de erro para usuário
- [ ] Adicionar analytics de tentativas de login

### 2. Sincronização Automática Google Sheets → Supabase (pilotos)
**Status:** Funcional (on-demand)  
**Prioridade:** Baixa (já funciona automaticamente no login)  
**Tempo estimado:** 30-40 min

**Descrição:**
- Atualmente funciona automaticamente quando piloto não é encontrado no Supabase
- Opção: Adicionar ao `sync-scheduler` para sincronização periódica completa

### 3. Atualizar Standings.jsx
**Status:** Pendente  
**Prioridade:** Média  
**Tempo estimado:** 15-20 min  
**Descrição:** Substituir busca direta do Google Sheets pelo hook `useSupabaseCache`

### 4. Melhorar syncPilotosFromSheet.js
**Status:** Pendente  
**Prioridade:** Baixa  
**Tempo estimado:** 20-30 min  
**Descrição:** 
- Adicionar validação de hash para detectar mudanças
- Implementar sincronização incremental (só atualizar o que mudou)

### 5. Criar página AdminSync.jsx
**Status:** Pendente (arquivo já existe, precisa ser integrado)  
**Prioridade:** Média  
**Tempo estimado:** 30-40 min  
**Descrição:** 
- Dashboard para monitorar sincronizações
- Botões para forçar sync manual
- Visualização de logs de sincronização

### 6. Configurar Supabase Cron Jobs
**Status:** Pendente  
**Prioridade:** Média  
**Tempo estimado:** 10-15 min  
**Descrição:** 
- Configurar cron jobs no Supabase Dashboard
- Automatizar execução do `sync-scheduler`
- Documentação do processo

---

## 📁 ESTRUTURA DE ARQUIVOS IMPORTANTES

### Hooks
- `src/hooks/useLeagueData.js` - Busca dados de classificação, tracks, PR (usa Supabase)
- `src/hooks/useSupabaseCache.js` - Hook genérico para cache Supabase
- `src/hooks/useAnalises.js` - Dados de análises
- `src/hooks/useCustomAlert.js` - Alert/Confirm customizados

### Páginas
- `src/pages/Home.jsx` - Página inicial (Minicup carrossel usa Supabase)
- `src/pages/Minicup.jsx` - Tabela Minicup (usa Supabase)
- `src/pages/Standings.jsx` - Classificação (AINDA usa Google Sheets direto)
- `src/pages/PowerRanking.jsx` - Power Ranking (usa Supabase via `usePowerRankingCache`)
- `src/pages/Admin.jsx` - Painel administrativo (com abas: Drivers, Stewards, Jurados, Narradores)
- `src/pages/AdminSync.jsx` - Dashboard de sincronização (criado, não integrado)
- `src/pages/Login.jsx` - Login com 2FA completo ✅
- `src/pages/Dashboard.jsx` - Painel do piloto com proteção 2FA e hero banner personalizado ✅
- `src/pages/PilotoAtivoOuEx.jsx` - Escolha entre piloto ativo e ex-piloto
- `src/pages/ExPilotoCadastro.jsx` - Cadastro de ex-pilotos
- `src/pages/ExPilotoLogin.jsx` - Login de ex-pilotos
- `src/pages/ExPilotoEscolha.jsx` - Escolha entre login e cadastro para ex-pilotos
- `src/pages/Narrador.jsx` - Painel do narrador (visualização somente leitura) ✅

### Edge Functions
- `supabase/functions/sync-google-sheets/index.ts` - Sincroniza Google Sheets → Supabase
- `supabase/functions/sync-scheduler/index.ts` - Orquestra sincronizações
- `supabase/functions/send-email/index.ts` - Envio de emails via SMTP
- `supabase/functions/send-whatsapp-code/index.ts` - Envio de código WhatsApp (2FA) ✅

### Utilitários
- `src/utils/whatsappAuth.js` - Funções para autenticação WhatsApp (2FA) ✅
- `src/utils/emailService.js` - Serviço de envio de emails
- `src/utils/syncPilotosFromSheet.js` - Sincronização de pilotos da planilha ✅

### Componentes
- `src/components/VideoEmbed.jsx` - Embed de vídeos de múltiplas plataformas (incluindo YouTube Shorts) ✅
- `src/components/CustomAlert.jsx` - Alert/Confirm customizados
- `src/components/DisableAutoScroll.jsx` - Previne scroll automático

### Schemas SQL
- `supabase-schema.sql` - Schema principal (pilotos, lances, acusacoes, defesas, verdicts, etc.)
- `supabase-schema-auth.sql` - Schema de autenticação (whatsapp_verification_codes) ✅
- `supabase-schema-auth-fix-rls.sql` - Correção de RLS policies ✅
- `supabase-schema-ex-pilotos.sql` - Schema para ex-pilotos ✅
- `supabase-schema-add-gamertag.sql` - Adição de campo gamertag ✅
- `supabase-schema-add-cod-idml.sql` - Adição de campo cod_idml ✅
- `supabase-schema-fix-pilotos-rls-ex-pilotos-insert.sql` - RLS para ex-pilotos ✅
- `supabase-schema-narradores.sql` - Schema para narradores ✅

### Scripts de Teste
- `teste-whatsapp-curl.bat` - Teste da Edge Function via cURL (Windows)
- `teste-whatsapp-terminal.ps1` - Teste da Edge Function via PowerShell

---

## 🔧 CONFIGURAÇÕES DO SUPABASE

### Tabelas Principais
- `pilotos` - Cadastro de pilotos (nome, email, grid, equipe, whatsapp, is_steward)
- `lances` - Lances polêmicos para análise
- `acusacoes` - Acusações de pilotos
- `defesas` - Defesas dos acusados
- `verdicts` - Vereditos dos stewards
- `email_log` - Log de emails enviados
- `notificacoes_admin` - Notificações para admins

### Tabelas de Cache
- `classificacao_cache` - Cache de classificação (Carreira/Light)
- `power_ranking_cache` - Cache de Power Ranking
- `calendario_cache` - Cache de calendário
- `tracks_cache` - Cache de tracks
- `minicup_cache` - Cache de Minicup
- `sync_log` - Log de sincronizações

### Tabelas de Autenticação
- `whatsapp_verification_codes` - Códigos de verificação 2FA ✅
  - Campos: `id`, `email`, `whatsapp`, `code`, `expires_at`, `used`, `attempts`, `created_at`
  - RLS habilitado e corrigido
  - Índices otimizados
  - Policies usando `auth.jwt() ->> 'email'` para validação

### Tabelas de Usuários Especiais
- `narradores` - Cadastro de narradores ✅
  - Campos: `id`, `nome`, `email`, `senha_hash`, `ativo`, `created_at`, `updated_at`
  - RLS habilitado
  - Senhas com hash SHA-256

### Edge Functions
- `SERVICE_ROLE_KEY` configurada como secret
- `SUPABASE_URL` disponível automaticamente
- Secrets do Twilio configurados:
  - `WHATSAPP_API_TYPE` = `twilio`
  - `TWILIO_ACCOUNT_SID` = (configurado)
  - `TWILIO_AUTH_TOKEN` = (configurado)
  - `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886`
- Secrets do Z-API (mantidos para fallback):
  - `ZAPI_INSTANCE` = (configurado)
  - `ZAPI_TOKEN` = (configurado)
  - `ZAPI_PHONE_ID` = (configurado)

### Variáveis de Ambiente
- `SERVICE_ROLE_KEY`: Chave de serviço do Supabase (configurada nas Edge Functions)
- Secrets do Twilio configurados e funcionando

---

## 📊 STATUS DAS SINCRONIZAÇÕES

### Dados Sincronizados
- ✅ Classificação (Carreira/Light) - Temporada 20
- ✅ Power Ranking
- ✅ Tracks
- ✅ Minicup
- ⚠️ Calendário (tabela criada, mas não sincronizado ainda)
- ✅ Pilotos (sincronização automática on-demand no login)

### Frequência de Sincronização
- Configurado no `sync-scheduler`:
  - Classificação: A cada 30 minutos
  - Power Ranking: A cada 1 hora
  - Tracks: A cada 2 horas
  - Minicup: A cada 15 minutos
  - Calendário: A cada 1 hora
- Pilotos: Sincronização automática quando necessário (login)

---

## 🐛 PROBLEMAS CONHECIDOS

1. **Idade negativa do cache** - RESOLVIDO ✅
   - Problema: `last_synced_at` no futuro (timezone)
   - Solução: Tratamento no `useSupabaseCache.js` para aceitar cache válido se diferença < 24h

2. **Scroll automático no admin** - RESOLVIDO ✅
   - Problema: Tela subia automaticamente ao expandir elementos
   - Solução: `DisableAutoScroll.jsx` + preservação de scroll position

3. **Mensagem WhatsApp não chegando** - RESOLVIDO ✅
   - Problema: Edge Function retornava sucesso, mas mensagem não chegava
   - Solução: Configuração correta dos secrets do Twilio

4. **Código inválido após receber no WhatsApp** - RESOLVIDO ✅
   - Problema: RLS policies não autorizavam leitura/atualização do código
   - Solução: Correção das policies para usar `auth.jwt() ->> 'email'` em vez de `auth.users`

5. **2FA pedindo código novamente após navegação** - RESOLVIDO ✅
   - Problema: Sistema não persistia validação entre recarregamentos
   - Solução: Implementado `localStorage["ml_pilot_2fa_ok:<email>"]` que persiste até logout

---

## 📝 PRÓXIMOS PASSOS SUGERIDOS

### Alta Prioridade:
1. **Testar fluxo completo com múltiplos usuários**
   - Verificar se sincronização automática funciona para todos
   - Validar persistência de 2FA em diferentes navegadores

2. **Monitorar logs do Supabase**
   - Verificar se há erros na Edge Function
   - Acompanhar uso de códigos de verificação

### Média Prioridade:
- Atualizar `Standings.jsx` para usar Supabase
- Integrar `AdminSync.jsx` na rota `/admin/sync`
- Configurar Cron Jobs no Supabase

### Baixa Prioridade:
- Melhorar `syncPilotosFromSheet.js` com hash e sincronização incremental
- Adicionar timer de reenvio de código
- Adicionar analytics de login

---

## 🔗 LINKS ÚTEIS

- **Supabase Dashboard:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp
- **Edge Functions:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
- **Secrets (Edge Functions):** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
- **Table Editor:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
- **Twilio Dashboard:** https://console.twilio.com
- **Twilio WhatsApp Sandbox:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

---

## 📌 NOTAS IMPORTANTES

### Sistema de Cache
- O sistema está usando **Supabase como fonte primária** para todos os dados principais
- **Google Sheets** continua sendo usado como **fallback automático** se Supabase falhar
- **localStorage** é usado como **último recurso** de cache
- Todas as sincronizações são **logadas** na tabela `sync_log` para monitoramento

### Sistema de Autenticação 2FA
- **Backend:** 100% implementado e funcionando ✅
- **Frontend:** 100% implementado e funcionando ✅
- **Configuração:** Twilio configurado e funcionando ✅
- **Fluxo:** Email → Supabase/Planilha → WhatsApp → Código → Validação → Dashboard ✅
- **Persistência:** localStorage (`ml_pilot_2fa_ok:<email>`) - válido até logout explícito ✅
- **Segurança:** Cada navegador/dispositivo precisa validar separadamente ✅

### Números de Telefone
- A função `formatPhoneNumber` remove automaticamente máscaras e caracteres não numéricos
- Formato esperado: `551983433940` (55 + DDD + número)
- Formato Twilio: `whatsapp:+551983433940`
- Formato Sandbox: `whatsapp:+14155238886` (número do Twilio)

### Persistência de 2FA
- **Como funciona:** Após validação bem-sucedida, salva `localStorage["ml_pilot_2fa_ok:<email>"] = "true"`
- **Quando persiste:** Entre recarregamentos, navegação entre páginas, fechar/abrir navegador
- **Quando limpa:** Apenas no logout explícito (botão "SAIR" no Dashboard)
- **Segurança:** Cada navegador/dispositivo precisa validar separadamente (mais seguro)
- **Vantagem:** Usuário não precisa validar código toda vez que acessa o sistema

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `AUTENTICACAO_2FA_SETUP.md` - Guia de setup do sistema 2FA
- `SETUP_TWILIO_PASSO_A_PASSO.md` - Guia detalhado de configuração do Twilio
- `DATABASE_STRUCTURE.md` - Estrutura completa do banco de dados
- `supabase-schema.sql` - Schema SQL principal
- `supabase-schema-auth.sql` - Schema SQL de autenticação
- `supabase-schema-auth-fix-rls.sql` - Correção de RLS policies
- `ESTADO_ATUAL_DOCUMENTACAO_COMPLETA.md` - Documentação detalhada do estado atual

---

**Última modificação:** 15/12/2025 - Sistema de narradores, hero banner personalizado por equipe, suporte a YouTube Shorts

---

## 🆕 NOVAS FUNCIONALIDADES (Última Atualização)

### Sistema de Narradores
- **Acesso:** `/narrador`
- **Funcionalidades:**
  - Login com email e senha
  - Visualização somente leitura dos painéis dos pilotos
  - Filtros por nome, equipe e grid
  - Seleção de piloto para visualização
- **Gerenciamento:** Aba "NARRADORES" no painel admin (`/admin`)
- **Arquivos:**
  - `src/pages/Narrador.jsx` - Página principal do narrador
  - `supabase-schema-narradores.sql` - Schema SQL

### Hero Banner Personalizado
- **Funcionalidade:** Banner do dashboard personalizado por equipe
- **Equipes suportadas:** Red Bull, Ferrari, Mercedes, McLaren, Aston Martin, Alpine, Haas, Williams, Sauber, VCARB
- **Localização:** `public/wallpapers/`
- **Formato:** JPG/PNG, resolução recomendada 1920x1080 ou superior
- **Fallback:** `/banner-masterleague.png` para pilotos sem equipe
- **Arquivos modificados:**
  - `src/pages/Dashboard.jsx` - Função `getTeamWallpaper()` adicionada

### Suporte a YouTube Shorts
- **Funcionalidade:** Detecção e renderização otimizada de YouTube Shorts
- **Layout:** Formato vertical (9:16) com altura de 600px
- **Container:** Largura máxima de 400px, centralizado
- **Arquivos modificados:**
  - `src/utils/videoEmbed.js` - Regex atualizado para detectar `/shorts/`
  - `src/components/VideoEmbed.jsx` - Layout adaptativo para Shorts
