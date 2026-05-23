# 👨‍⚖️ Configuração dos Jurados - Master League F1

## 📋 Resumo do Sistema

O acesso ao Painel do Júri utiliza **verificação em duas etapas**:
1. **Login com Google** - O e-mail deve estar cadastrado como jurado
2. **Verificação de WhatsApp** - O número deve corresponder ao cadastro

## 1. Criar a Tabela no Supabase

Acesse o **SQL Editor** no Supabase e execute o script em `scripts/criar_jurados.sql`.

Isso criará 5 slots de jurados: `jurado1`, `jurado2`, `jurado3`, `jurado4`, `jurado5`

## 2. Cadastrar os Jurados (Painel Admin)

1. Acesse o **Painel Administrativo** → Aba **👨‍⚖️ JÚRI**
2. Para cada jurado, clique em **✏️ Editar**
3. Preencha:
   - **Nome do Jurado** - Nome que aparecerá no sistema
   - **E-mail Google** - Conta Google que o jurado usará para logar
   - **WhatsApp** - Número no formato (00) 00000-0000
4. Clique em **💾 Salvar**
5. Clique em **▶️ Ativar** para liberar o acesso

## 3. Fluxo de Acesso do Jurado

```
┌─────────────────────┐
│  Jurado acessa      │
│  /veredito          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Login com Google   │──── Se email não cadastrado → ❌ Acesso negado
└─────────┬───────────┘
          │ Email OK
          ▼
┌─────────────────────┐
│  Confirmar WhatsApp │──── Se não bater → ❌ Acesso negado
│  (00) 00000-0000    │
└─────────┬───────────┘
          │ WhatsApp OK
          ▼
┌─────────────────────┐
│  ✅ Acesso liberado │
│  Nome do jurado     │
│  aparece no painel  │
└─────────────────────┘
```

## 4. Comandos SQL Úteis

```sql
-- Ver todos os jurados
SELECT * FROM jurados ORDER BY id;

-- Alterar nome
UPDATE jurados SET nome = 'Novo Nome' WHERE usuario = 'jurado1';

-- Alterar email
UPDATE jurados SET email_google = 'novo@gmail.com' WHERE usuario = 'jurado1';

-- Alterar WhatsApp
UPDATE jurados SET whatsapp = '(11) 99999-9999' WHERE usuario = 'jurado1';

-- Desativar jurado
UPDATE jurados SET ativo = false WHERE usuario = 'jurado1';

-- Reativar jurado
UPDATE jurados SET ativo = true WHERE usuario = 'jurado1';
```

## 5. Segurança

- ✅ Login obrigatório com Google
- ✅ Verificação de WhatsApp cadastrado
- ✅ Jurado só acessa se estiver **ATIVO**
- ✅ Sessão mantida (não precisa logar toda vez)
- ✅ Admin pode desativar jurado a qualquer momento
