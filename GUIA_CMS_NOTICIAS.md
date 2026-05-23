# 📝 Guia Completo: CMS de Notícias

## 📋 O que mudou?

Agora você tem um **CMS completo** no painel de Admin para gerenciar notícias! Não precisa mais depender exclusivamente do Google Sheets.

### ✨ Novidades:
- ✅ Criar, editar e excluir notícias diretamente pelo Admin
- ✅ Upload de imagens integrado
- ✅ Prioridade: Supabase > Google Sheets > Notícias padrão
- ✅ Formatação automática do texto (justificado, com parágrafos)
- ✅ Sistema de destaque (featured)
- ✅ Links externos opcionais

---

## 🚀 SETUP INICIAL (Execute 1 vez)

### Passo 1: Executar o Script SQL no Supabase

1. Abra o arquivo `setup-noticias-cms-supabase.sql` no seu projeto
2. **Copie TODO o conteúdo** do arquivo
3. Acesse https://app.supabase.com
4. Entre no seu projeto
5. No menu lateral, clique em **SQL Editor**
6. Clique em **"+ New query"**
7. **Cole** o código SQL e clique em **"Run"**

**O que esse script faz:**
- Cria a tabela `noticias` no Supabase
- Configura permissões (RLS)
- Adiciona trigger para atualização automática de datas
- Habilita Realtime (atualizações em tempo real)

### Passo 2: Verificar se funcionou

1. No Supabase, vá em **Table Editor**
2. Procure pela tabela `noticias` na lista
3. Se aparecer, está tudo certo! ✅

---

## 📝 Como usar o CMS de Notícias

### 1. Acessar o CMS

1. Entre no painel de **Admin** do site
2. Clique na aba **NOTÍCIAS**
3. Role a página até ver a seção "**Gerenciar Notícias (CMS)**"

### 2. Criar uma Nova Notícia

1. Clique no botão **"➕ Nova Notícia"**
2. Preencha os campos:
   - **ID**: Número único (ex: 1, 2, 3...) - usado também para a imagem
   - **Título**: Título chamativo da notícia
   - **Data**: No formato DD/MM/AAAA (ex: 23/12/2025)
   - **Categoria**: Escolha entre Notícia, Corrida, Análise, Grid Light, Minicup, Regulamento
   - **Destaque?**: Marque se quiser que apareça em destaque no feed
   - **Texto Completo**: Digite o texto completo da notícia
     - **Dica**: Use **Shift+Enter** para criar parágrafos
     - O texto será exibido justificado automaticamente no site
   - **Link Externo**: (Opcional) Se preencher, o botão "Ler mais" abrirá este link

3. Clique em **"💾 Salvar Notícia"**

### 3. Fazer Upload da Imagem

1. Na seção de upload (acima do CMS):
2. Digite o **ID da notícia** que você acabou de criar
3. Clique em **"Selecionar Imagem"** e escolha o arquivo
4. A imagem será salva automaticamente como `noticia{ID}` no Supabase Storage

### 4. Editar uma Notícia Existente

1. Na lista de notícias, clique no botão **"✏️ Editar"** da notícia desejada
2. Altere os campos que quiser
3. Clique em **"💾 Salvar Notícia"**

### 5. Excluir uma Notícia

1. Na lista de notícias, clique no botão **"🗑️"**
2. Confirme a exclusão

---

## 🔄 Como funciona a Prioridade?

O site busca notícias nesta ordem:

### 1º: Supabase (CMS do Admin)
- Se houver notícias no Supabase, **usa apenas essas**
- Não busca do Google Sheets

### 2º: Google Sheets (Fallback)
- Se o Supabase estiver vazio, busca da planilha
- Útil para manter compatibilidade com o sistema antigo

### 3º: Notícias Padrão
- Se nem Supabase nem Sheets estiverem disponíveis
- Exibe 3 notícias de exemplo

---

## 💡 Dicas de Uso

### Formatação do Texto

✅ **BOM:**
```
O Campeonato de pré-temporada da Master League F1 foi decidido por apenas dois pontos após seis corridas disputadas.

A Master League F1 encerrou nesta semana o seu torneio de pré-temporada...

Rodadas 1 e 2: O torneio começou com equilíbrio...
```

❌ **RUIM:**
```
O Campeonato de pré-temporada da Master League F1 foi decidido por apenas dois pontos após seis corridas disputadas. A Master League F1 encerrou nesta semana o seu torneio de pré-temporada...Rodadas 1 e 2: O torneio começou com equilíbrio...
```

### Notícias em Destaque

- Marque apenas 1-2 notícias como "Destaque"
- Notícias em destaque aparecem primeiro no feed
- No feed, ocupam o dobro do espaço (grid de 2 colunas)

### IDs das Notícias

- Use IDs sequenciais: 1, 2, 3, 4...
- O ID é usado para referência da imagem (`noticia1`, `noticia2`, etc.)
- Não altere o ID após criar a notícia (ou a imagem ficará desvinculada)

### Links Externos

- Se deixar vazio: botão "Ler mais" vai para `/noticias`
- Se preencher com URL externa: abre em nova aba
- Se preencher com rota interna (ex: `/regulamento`): navega na mesma aba

---

## 📊 Comparação: Supabase vs Google Sheets

| Recurso | Supabase (CMS) | Google Sheets |
|---------|----------------|---------------|
| Criar notícias | ✅ Pelo Admin | ❌ Só editando planilha |
| Upload de imagem | ✅ Integrado | ❌ Precisa Drive ou deploy |
| Formatação | ✅ Automática | ⚠️ Manual (Alt+Enter) |
| Prioridade | ✅ Primeiro | ⚠️ Segundo (fallback) |
| Edição rápida | ✅ Direto no Admin | ❌ Precisa abrir planilha |
| Exclusão | ✅ Botão de deletar | ❌ Precisa apagar linha |
| Realtime | ✅ Sim | ❌ Não |

---

## 🛠️ Troubleshooting

### "Erro ao carregar notícias"
- Verifique se executou o script SQL (`setup-noticias-cms-supabase.sql`)
- Verifique se a tabela `noticias` existe no Supabase

### "Erro ao salvar notícia"
- Certifique-se de que preencheu pelo menos **ID** e **Título**
- Verifique se as políticas RLS estão configuradas

### Imagem não aparece
- Verifique se fez upload da imagem com o **mesmo ID** da notícia
- Verifique se o bucket `noticias` existe no Supabase Storage
- Veja o guia: `GUIA_NOTICIAS_SUPABASE_STORAGE.md`

### Notícias do Sheets não aparecem mais
- **Isso é normal!** Se você criar notícias no Supabase, elas têm prioridade
- Para voltar a usar Sheets, exclua todas as notícias do Supabase

---

## 🎯 Workflow Recomendado

### Para gerenciar notícias:
1. ✅ Use o **CMS do Admin** (Supabase)
2. ✅ Mantenha o Google Sheets como **backup/histórico**

### Para atualizações rápidas:
1. Entre no Admin
2. Edite a notícia diretamente
3. Salve - **atualiza instantaneamente no site!**

---

## 🎉 Pronto!

Agora você tem um CMS completo de notícias! Não precisa mais:
- ❌ Editar planilhas
- ❌ Fazer deploy para atualizar imagens
- ❌ Copiar links do Google Drive
- ❌ Formatar texto manualmente

Tudo é gerenciado diretamente pelo painel de Admin! 🚀

---

**Data**: Dezembro 2025  
**Versão**: 1.0





















