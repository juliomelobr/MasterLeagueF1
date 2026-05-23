# 🎙️ Fluxo de Primeiro Acesso - Narradores

## 📋 Resumo das Alterações

Implementado sistema de primeiro acesso para narradores com criação de senha e verificação via WhatsApp.

---

## 🔄 Novo Fluxo

### 1. Cadastro pelo Admin (`/admin` - aba NARRADORES)

**Campos obrigatórios:**
- ✅ Nome
- ✅ E-mail
- ✅ WhatsApp

**O que mudou:**
- ❌ Removido campo "Senha" do cadastro
- ✅ Adicionado campo "WhatsApp"
- ✅ Narrador é criado sem senha (`senha_hash = NULL`, `senha_definida = false`)

### 2. Primeiro Acesso do Narrador (`/narrador`)

**Passo 1: Login com Email**
- Narrador digita apenas o email
- Sistema detecta que é primeiro acesso (senha não definida)

**Passo 2: Criar Senha**
- Tela exibe: "PRIMEIRO ACESSO"
- Narrador digita a senha 2x para confirmar
- Validação: mínimo 4 caracteres e senhas devem coincidir
- Ao clicar em "Enviar Código via WhatsApp", sistema envia código para o WhatsApp cadastrado

**Passo 3: Verificar Código**
- Tela exibe o número de WhatsApp que receberá o código
- Narrador digita o código de 6 dígitos recebido
- Opção de reenviar código se necessário
- Ao confirmar código válido:
  - Senha é salva (hash SHA-256)
  - `senha_definida` é marcado como `true`
  - Narrador é autenticado automaticamente
  - Acesso ao painel liberado

### 3. Acessos Subsequentes

- Login normal com email e senha
- Mesmo fluxo de antes

---

## 🗄️ Mudanças no Banco de Dados

### Schema Atualizado

```sql
CREATE TABLE public.narradores (
    id UUID PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,          -- NOVO
    senha_hash VARCHAR(255) DEFAULT NULL,   -- Agora opcional
    senha_definida BOOLEAN DEFAULT false,   -- NOVO
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Migração

Se a tabela já existe, execute `migrar_tabela_narradores.sql` para adicionar os novos campos.

Se a tabela não existe, execute `criar_tabela_narradores.sql` para criar do zero.

---

## 📁 Arquivos Modificados

### 1. `criar_tabela_narradores.sql`
- Schema atualizado com campos `whatsapp` e `senha_definida`
- `senha_hash` agora é opcional (NULL permitido)

### 2. `migrar_tabela_narradores.sql` (NOVO)
- Script para atualizar tabela existente
- Adiciona campos faltantes
- Atualiza registros existentes

### 3. `src/pages/Admin.jsx`
- ✅ Removido campo "Senha" do formulário de criação
- ✅ Adicionado campo "WhatsApp" no cadastro
- ✅ Atualizado `handleSaveNewNarrador()` para não criar senha
- ✅ Atualizado `handleEditNarrador()` para incluir WhatsApp
- ✅ Atualizado `handleSaveNarrador()` para validar WhatsApp
- ✅ Exibição da lista mostra WhatsApp e status da senha

### 4. `src/pages/Narrador.jsx`
- ✅ Importado `requestVerificationCode` e `verifyCode` de `whatsappAuth.js`
- ✅ Adicionados estados para primeiro acesso
- ✅ `handleLogin()` detecta primeiro acesso
- ✅ `handleCriarSenha()` valida senha e envia código WhatsApp
- ✅ `handleVerificarCodigo()` valida código e salva senha
- ✅ Telas de UI para criar senha e verificar código

---

## 🚀 Como Usar

### Passo 1: Atualizar Banco de Dados

**Se a tabela NÃO existe:**
1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new
2. Execute: `criar_tabela_narradores.sql`

**Se a tabela JÁ existe:**
1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new
2. Execute: `migrar_tabela_narradores.sql`

### Passo 2: Cadastrar Narrador

1. Acesse `/admin` > aba "NARRADORES"
2. Clique em "+ Novo Narrador"
3. Preencha: Nome, E-mail, WhatsApp
4. Clique em "Criar"
5. ✅ Narrador criado (sem senha)

### Passo 3: Primeiro Acesso do Narrador

1. Narrador acessa `/narrador`
2. Digita apenas o email
3. Sistema detecta primeiro acesso
4. Tela de criar senha aparece
5. Digita senha 2x
6. Clica em "Enviar Código via WhatsApp"
7. Recebe código no WhatsApp
8. Digita código de 6 dígitos
9. Clica em "Confirmar e Finalizar"
10. ✅ Acesso liberado!

---

## ✅ Checklist de Testes

- [ ] Executar script SQL (criar ou migrar tabela)
- [ ] Cadastrar novo narrador no admin (sem senha)
- [ ] Verificar que narrador aparece com "Senha: ❌ Não definida"
- [ ] Fazer primeiro acesso com email do narrador
- [ ] Criar senha (2x) e enviar código
- [ ] Receber código no WhatsApp
- [ ] Verificar código e finalizar cadastro
- [ ] Verificar que narrador aparece com "Senha: ✅ Definida"
- [ ] Fazer logout e login novamente com email e senha
- [ ] Verificar que login funciona normalmente

---

## 🔧 Troubleshooting

### Erro: "Could not find the table 'public.narradores'"
- Execute o script `criar_tabela_narradores.sql` no Supabase

### Erro: "column 'whatsapp' does not exist"
- Execute o script `migrar_tabela_narradores.sql` no Supabase

### Código WhatsApp não chega
- Verifique se a Edge Function `send-whatsapp-code` está deployada
- Verifique se os secrets do WhatsApp estão configurados no Supabase
- Veja logs da Edge Function no Supabase Dashboard

### Senha não salva após verificar código
- Verifique logs do console do navegador
- Verifique se `senha_definida` está sendo atualizado no banco
- Verifique políticas RLS da tabela `narradores`

---

## 📝 Notas

- A Edge Function `send-whatsapp-code` já existe e é usada para outros fluxos (pilotos, ex-pilotos)
- O código de verificação expira em 10 minutos
- Narradores com senha já definida continuam funcionando normalmente
- Admin pode redefinir senha de narradores existentes editando e preenchendo "Nova Senha"

