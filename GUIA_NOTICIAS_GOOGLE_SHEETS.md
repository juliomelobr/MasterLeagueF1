# 📰 Guia: Configurar Notícias via Google Sheets

Este guia explica como configurar uma planilha do Google Sheets para gerenciar as notícias do site.

---

## 📋 Passo 1: Criar a Planilha

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma nova planilha
3. Nomeie como "Notícias Master League F1" (ou qualquer nome)

---

## 📊 Passo 2: Configurar as Colunas

Na primeira linha (cabeçalho), crie as seguintes colunas:

| id | title | excerpt | date | category | image | featured | link |
|----|-------|---------|------|----------|-------|----------|------|

**Explicação das colunas:**

- **id**: Número único da notícia (1, 2, 3, ...)
- **title**: Título da notícia
- **excerpt**: Resumo/descrição da notícia
- **date**: Data no formato "DD MMM YYYY" (ex: "15 Jan 2025")
- **category**: Categoria (ex: "Corrida", "Análise", "Grid Light", "Minicup")
- **image**: URL da imagem (opcional). Se você preencher, o site tenta carregar essa URL primeiro (Google Drive/URL externa).
  - **Recomendado**: deixe vazio e use upload no site (Supabase Storage) com nome fixo `noticia1`, `noticia2`, etc. (sem deploy no Netlify).
- **featured**: `true` ou `1` para destacar, `false` ou `0` para normal
- **link**: URL para onde o botão "Ler mais" deve direcionar (pode ser link externo ou rota interna). Deixe vazio para ir para `/noticias`

---

## 📝 Passo 3: Preencher Dados de Exemplo

Na segunda linha em diante, adicione suas notícias:

```
1 | GP de Abu Dhabi: Campeão é Coroado | Confira todos os detalhes da última etapa... | 15 Jan 2025 | Corrida | https://drive.google.com/... | true | https://exemplo.com/noticia-completa
2 | Análise: Melhor Volta da Temporada | Relembre os recordes de volta rápida... | 12 Jan 2025 | Análise | | false | /analises
3 | Grid Light: Novos Desafios | A competição no Grid Light está mais acirrada... | 10 Jan 2025 | Grid Light | | false | 
```

**Sobre a coluna `link`:**
- **Link externo**: Use URLs completas como `https://exemplo.com/noticia` (abre em nova aba)
- **Rota interna**: Use rotas do site como `/analises`, `/powerranking`, etc. (navega no mesmo site)
- **Vazio**: Se deixar vazio, o botão "Ler mais" levará para `/noticias`

---

## 🔗 Passo 4: Publicar a Planilha

1. No Google Sheets, clique em **"Arquivo"** > **"Compartilhar"** > **"Publicar na web"**
2. Selecione a aba da planilha (geralmente "Planilha1")
3. No formato, escolha **"Valores separados por vírgula (.csv)"**
4. Clique em **"Publicar"**
5. **Copie a URL gerada**

A URL será algo como:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pub?gid=0&single=true&output=csv
```

---

## 🖼️ Passo 5: Adicionar Imagens

### ⚠️ Importante: Imagens Coladas no Google Sheets

**Não é possível usar imagens coladas diretamente na planilha** porque quando exportamos como CSV, apenas os dados de texto são incluídos. As imagens inseridas no Google Sheets não são exportadas.

### ✅ Solução Recomendada: Upload direto no site (Supabase Storage)

Você consegue subir a imagem no seu próprio painel (Admin > NOTÍCIAS) e ela aparece no feed sem precisar publicar no Netlify.

**Como funciona:**
- Você escolhe o **ID da notícia** (1, 2, 3…)
- Faz upload da imagem
- O site salva no Supabase Storage como `noticia{ID}` e substitui a anterior

> Para configurar o Supabase (bucket `noticias` + tabela `news_images`), veja `COMO_ADICIONAR_IMAGENS_NOTICIAS.md`.

### ✅ Solução Recomendada: Google Drive

**Método Rápido:**

1. **Faça upload da imagem no Google Drive**
   - Acesse [Google Drive](https://drive.google.com)
   - Arraste a imagem ou clique em "Novo" > "Upload de arquivo"

2. **Obtenha o link da imagem**
   - Clique com botão direito na imagem
   - Selecione **"Obter link"**
   - Altere a permissão para **"Qualquer pessoa com o link"**
   - Copie o link

3. **Converta o link para formato direto**
   - O link será algo como:
     ```
     https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
     ```
   - Extraia o ID (a parte entre `/d/` e `/view`): `1ABC123xyz`
   - Use este formato na planilha:
     ```
     https://drive.google.com/uc?export=view&id=1ABC123xyz
     ```

4. **Cole na coluna `image` da planilha**

**Exemplo prático:**
- Link original: `https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456/view?usp=sharing`
- ID extraído: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456`
- Link para usar: `https://drive.google.com/uc?export=view&id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456`

### 📋 Dica: Organizar Imagens

**Crie uma pasta no Google Drive para as notícias:**
1. Crie uma pasta chamada "Notícias Master League"
2. Faça upload de todas as imagens lá
3. Facilita encontrar e gerenciar as imagens

### 🔗 Outras Opções de Imagens

**Opção B: URL Externa**
- Use qualquer URL de imagem válida de outros sites
- URLs de CDN (Cloudinary, Imgur, etc.)
- Links diretos de imagens hospedadas

**Opção C: Imagens Locais do Site**
- Se a imagem estiver na pasta `public` do site, use:
  ```
  /banner-masterleague.png
  /caminho/para/imagem.jpg
  ```

### 💡 Workflow Sugerido

1. **Coloque a imagem na planilha para referência visual** (opcional, só para você ver)
2. **Na coluna `image`, cole o link do Google Drive** (formato correto)
3. Assim você tem a imagem visível na planilha E o link funcionando no site!

---

## ⚙️ Passo 6: Configurar no Código

1. Abra o arquivo `src/pages/Home.jsx`
2. Localize a linha com `NEWS_CSV_URL` (por volta da linha 9)
3. Substitua a URL pela URL da sua planilha:

```javascript
const NEWS_CSV_URL = 'COLE_SUA_URL_AQUI';
```

---

## ✅ Passo 7: Testar

1. Salve a planilha
2. Recarregue a página do site
3. As notícias devem aparecer automaticamente!

---

## 💡 Dicas

- **Ordem das notícias**: A notícia com `featured: true` sempre aparece primeiro
- **Sem imagem**: Deixe a coluna `image` vazia se não quiser imagem
- **Múltiplas categorias**: Você pode criar qualquer categoria (Corrida, Análise, Grid Light, etc.)
- **Atualização**: As notícias são atualizadas automaticamente quando você recarrega a página

---

## 🔄 Atualizar Notícias

Para atualizar as notícias:

1. Abra a planilha do Google Sheets
2. Edite os dados diretamente
3. Salve (Ctrl+S)
4. Recarregue a página do site

**Pronto!** As notícias serão atualizadas automaticamente.

---

## 📋 Exemplo Completo de Planilha

| id | title | excerpt | date | category | image | featured | link |
|----|-------|---------|------|----------|-------|----------|------|
| 1 | GP de Abu Dhabi: Campeão é Coroado | Confira todos os detalhes da última etapa da temporada e a celebração do novo campeão da Master League F1. | 15 Jan 2025 | Corrida | https://drive.google.com/uc?export=view&id=1ABC... | true | https://exemplo.com/noticia-completa |
| 2 | Análise: Melhor Volta da Temporada | Relembre os recordes de volta rápida que marcaram a temporada e os pilotos que se destacaram. | 12 Jan 2025 | Análise | | false | /analises |
| 3 | Grid Light: Novos Desafios | A competição no Grid Light está mais acirrada do que nunca. Veja quem está na briga pelo título. | 10 Jan 2025 | Grid Light | | false | |

---

## ❓ Problemas Comuns

### Notícias não aparecem
- Verifique se a planilha está publicada corretamente
- Confirme se a URL está correta no código
- Verifique o console do navegador (F12) para erros

### Imagens não carregam
- Verifique se a URL da imagem está correta
- Para Google Drive, use o formato `uc?export=view&id=...`
- Teste a URL da imagem diretamente no navegador

### Notícias em ordem errada
- Notícias com `featured: true` sempre aparecem primeiro
- Depois, são ordenadas por data (mais recente primeiro)

---

**Pronto!** Agora você pode gerenciar todas as notícias diretamente pelo Google Sheets! 🎉

