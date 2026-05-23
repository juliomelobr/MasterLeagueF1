# 📝 Guia do Editor de Notícias

## 🎯 Como Funciona:

### **Resumo** (Google Sheets):
- Editado na planilha
- Aparece no feed da Home
- Texto curto (2-3 linhas)

### **Matéria Completa** (Supabase/Admin):
- Editado no painel de Admin
- Aparece em `/noticias/:id`
- Texto longo com formatação completa

---

## 🛠️ Ferramentas de Formatação no Admin:

### 1. **Botão "B Negrito"**
- Selecione o texto que quer em negrito
- Clique no botão **B Negrito**
- O texto ficará entre `**` automaticamente

**Exemplo:**
```
Antes: A Minicup foi eletrizante
Depois: A Minicup foi **eletrizante**
Resultado no site: A Minicup foi eletrizante (em negrito)
```

### 2. **Botão "📌 Título"**
- Selecione o texto do título da seção
- Clique no botão **📌 Título**
- Adiciona `## ` no início

**Exemplo:**
```
Antes: O Caminho para o Título
Depois: ## O Caminho para o Título
Resultado no site: Grande título vermelho em caixa alta
```

### 3. **Botão "¶ Parágrafo"**
- Clique para adicionar espaço entre parágrafos
- Adiciona duas quebras de linha

### 4. **Botão "🗑️ Limpar"**
- Remove todo o conteúdo
- Pede confirmação antes

---

## ✍️ Como Escrever uma Matéria:

### Exemplo Completo:

```
## O Caminho para o Título

A Minicup foi dividida em três etapas duplas, testando a versatilidade dos pilotos em circuitos clássicos e desafiadores.

**Rodadas 1 e 2 (Áustria e Austrália)**

O torneio começou com equilíbrio. **Andrei Brauer** (Williams) brilhou na abertura na Áustria e **Lucas Monteiro** se destacou na Austrália, rapidamente dominando as ações e vencendo a segunda prova na Austrália, colocando-se como um forte candidato ao título logo no início.

**Rodadas 3 e 4 (Japão e Mônaco)**

No Japão (Suzuka), **Yuri Rodrigues** brilhou e conquistou uma vitória fundamental que o impulsionou na tabela. Já nas ruas do Principado de Mônaco, o caos e a técnica se encontraram, com **Alexandre Henrique** vencendo as armadilhas de Monte Carlo para levar a vitória em uma prova dramática.

## A Grande Final

A decisão ficou para os circuitos lendários de Silverstone e Ímola. Com a tabela apertada, a consistência de Rodrigues falou mais alto, garantindo-lhe o troféu de campeão da Minicup.
```

### Resultado no Site:

- **"## O Caminho para o Título"** → Título grande em vermelho
- **"**Andrei Brauer**"** → Nome em negrito branco
- Parágrafos separados automaticamente
- Texto justificado

---

## 📋 Formatação Suportada:

| Código | Resultado |
|--------|-----------|
| `**texto**` | **texto em negrito** |
| `## Título` | **TÍTULO GRANDE EM VERMELHO** |
| Linha em branco | Novo parágrafo |
| Shift+Enter | Nova linha |

---

## 💡 Dicas de Uso:

### Para Colar Texto do Word/Docs:

1. Cole o texto normalmente no campo
2. O texto será preservado com parágrafos
3. Adicione manualmente:
   - `**` em palavras importantes
   - `## ` em títulos de seção

### Para Escrever Direto:

1. Escreva normalmente
2. Use os botões para formatar
3. Clique em "👁️ Visualizar prévia" para ver como ficará

### Estrutura Recomendada:

```
## Introdução/Contexto
Parágrafo introdutório...

## Desenvolvimento
**Destaques importantes** e detalhes...

## Conclusão
Parágrafo final...
```

---

## 🎨 Exemplo Real:

### No Editor (Admin):
```
## Yuri Rodrigues É Campeão

A disputa foi decidida por apenas **2 pontos** após seis corridas intensas.

**Destaques da Competição**

Entre os destaques, **J. Oliveira** (Haas) fechando o pódio em 3º lugar após desempate com **P. Folha**.
```

### No Site (`/noticias/1`):

**YURI RODRIGUES É CAMPEÃO** ← (Título vermelho grande)

A disputa foi decidida por apenas **2 pontos** após seis corridas intensas.

**Destaques da Competição** ← (Subtítulo vermelho)

Entre os destaques, **J. Oliveira** (Haas) fechando o pódio em 3º lugar após desempate com **P. Folha**.

---

## ✅ Checklist para Publicar:

- [ ] Resumo adicionado no Google Sheets
- [ ] ID escolhido (ex: 1, 2, 3...)
- [ ] Matéria completa escrita no Admin com formatação
- [ ] Imagem enviada (mesmo ID)
- [ ] **Preview visualizado** (clique em "Visualizar prévia")
- [ ] Notícia salva
- [ ] Testado em `/noticias/:id`

---

**Tudo pronto! Sistema publicado no Netlify!** 🚀

Seu editor agora tem:
- ✅ Botões de formatação
- ✅ Preview ao vivo
- ✅ Suporte a colar texto formatado
- ✅ Títulos e negritos





















