# 👨‍⚖️ Atualizar Sistema de Jurados para 9

## 📋 Resumo

O sistema atualmente suporta 5 jurados, mas precisa ser expandido para 9. Os jurados existentes precisam ser renomeados e novos precisam ser adicionados.

**Jurados Atuais:**
- juradoA → será renomeado para **jurado1**
- juradoB → será renomeado para **jurado2**
- juradoC → será renomeado para **jurado3**
- jurado4 → permanece como **jurado4**
- jurado5 → permanece como **jurado5**

**Novos Jurados:**
- **jurado6** (novo)
- **jurado7** (novo)
- **jurado8** (novo)
- **jurado9** (novo)

---

## 🚀 Passo 1: Executar Script SQL

1. Acesse o **Supabase Dashboard**: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
2. Vá em **SQL Editor** (menu lateral)
3. Abra o arquivo: `scripts/atualizar_jurados_para_9.sql`
4. **Copie TODO o conteúdo** do arquivo
5. **Cole no SQL Editor** do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. Aguarde alguns segundos
8. Você deve ver uma mensagem de sucesso

---

## ✅ Passo 2: Verificar Resultado

Após executar o script, execute esta query para verificar:

```sql
SELECT id, usuario, nome, email_google, whatsapp, ativo, created_at, updated_at 
FROM jurados 
ORDER BY usuario;
```

Você deve ver **9 jurados**:
- jurado1
- jurado2
- jurado3
- jurado4
- jurado5
- jurado6
- jurado7
- jurado8
- jurado9

---

## 📝 Passo 3: Configurar Novos Jurados (Opcional)

Os novos jurados (6, 7, 8, 9) serão criados sem dados. Para configurá-los:

1. Acesse o **Painel Admin** → Aba **👨‍⚖️ JÚRI**
2. Você verá os 9 jurados listados
3. Para cada novo jurado (6, 7, 8, 9), clique em **✏️ Editar**
4. Preencha:
   - **Nome do Jurado**
   - **E-mail Google**
   - **WhatsApp**
5. Clique em **💾 Salvar**
6. Clique em **▶️ Ativar** para liberar o acesso

---

## ⚠️ Importante

- Os dados dos jurados existentes (nome, email, whatsapp) serão **preservados** durante a renomeação
- Apenas o campo `usuario` será alterado (A→1, B→2, C→3)
- Os novos jurados (6, 7, 8, 9) serão criados **sem dados** e precisarão ser configurados no admin

---

## 🔍 Verificação de Código

O código já foi atualizado para:
- ✅ Suportar qualquer quantidade de jurados (sem limite hardcoded)
- ✅ Usar os novos nomes (jurado1, jurado2, etc.) no arquivo de teste

---

## 📊 Resultado Final

Após executar o script, você terá:
- **9 slots de jurados** disponíveis
- **Nomenclatura padronizada**: jurado1 a jurado9
- **Todos os dados preservados** dos jurados existentes
