# Auditoria de performance — BibliASPA

**Data:** 2026-07-29  
**Objetivo:** deixar o app mais rápido e suave, com recomendações explicadas para quem está começando no desenvolvimento.

## Resumo para começar

O app funciona, mas hoje algumas telas baixam muito mais dados do que precisam. O maior ganho virá de três mudanças:

1. Não carregar o catálogo inteiro para a Home, categorias, detalhes e painel administrativo.
2. Esperar o usuário parar de digitar antes de pesquisar no banco.
3. Dividir o JavaScript por rota, especialmente o importador Excel e as ferramentas administrativas.

## Medições e evidências

| Área | Situação observada | Impacto |
|---|---|---|
| Bundle inicial | O build produziu aproximadamente **937 KB** de JavaScript minificado e mostrou o aviso de chunk maior que 500 KB. | Download e execução inicial mais lentos, especialmente em celular. |
| Home | `src/pages/Home.tsx` chama `fetchBooks()`, que faz `select('*')`, embora use só quatro livros. | Todo o catálogo é baixado para mostrar poucos destaques. |
| Categorias | `src/pages/Categories.tsx` também usa `fetchBooks()` e calcula contagens no navegador. | Custo de rede e CPU cresce com o número de livros. |
| Detalhes | `src/pages/BookDetails.tsx` carrega todos os livros para encontrar um livro e similares. | Uma página de detalhe pode transferir o catálogo completo. |
| Busca | `src/pages/Browse.tsx` dispara a busca a cada alteração do campo. | Muitas consultas enquanto o usuário digita. |
| Busca no banco | `searchBooks()` usa `select('*')` e `count: 'exact'`. | Mais dados transferidos e contagem exata pode ficar cara em tabelas grandes. |
| Admin | Dashboard e etiquetas carregam todos os livros. | Lentidão e consumo de memória com acervo grande. |
| Rotas | `src/App.tsx` importa todas as páginas, incluindo `xlsx`, no carregamento inicial. | O visitante público baixa código de funcionalidades administrativas. |
| Imagens | Há imagens externas sem `loading="lazy"`, `width`/`height` ou `decoding="async"`. | Mais trabalho de rede e risco de layout shift. |

## Plano priorizado

### P0 — ganhos rápidos e seguros

#### 1. Adicionar debounce na busca

Mantenha o texto digitado em um estado local e atualize `searchQuery` somente após cerca de 300–500 ms sem digitação. Alternativamente, use um hook `useDebouncedValue`. Isso reduz consultas e deixa a interface menos “nervosa”.

Também cancele a consulta anterior com `AbortController` ou ignore respostas antigas. Sem isso, uma resposta lenta para uma busca anterior pode chegar depois e substituir o resultado atual.

#### 2. Limitar os campos retornados

Crie seleções reutilizáveis em `src/data/books.ts`, por exemplo:

```ts
const BOOK_LIST_FIELDS =
  'id, arabic_title, transliteration, translated_title, author_latin, author_arabic, categories, cover_image';
```

Use campos menores na lista, campos específicos na Home e todos os campos apenas no detalhe/admin quando forem realmente necessários. Evite `select('*')`.

#### 3. Corrigir a Home

Em vez de baixar tudo e fazer `slice(0, 4)`, busque diretamente:

```ts
supabase.from('books').select(BOOK_LIST_FIELDS)
  .order('created_at', { ascending: false })
  .limit(4);
```

#### 4. Lazy-load das rotas administrativas

Use `lazy(() => import(...))` e `Suspense` para `Dashboard`, `AddBook`, `CatalogImporter`, `BulkImport` e `PrintLabels`. O visitante público não precisa baixar `xlsx`, telas de importação e código de administração.

Essa é provavelmente a melhor correção para o aviso do bundle de 937 KB.

### P1 — quando o acervo crescer

#### 5. Mover contagens de categorias para o banco

`Categories.tsx` calcula a contagem com vários `filter()` sobre o catálogo completo. Crie uma view ou função SQL que retorne cada categoria e sua contagem. O banco é melhor para essa agregação.

Para metadados, considere uma view/cache atualizado quando um livro mudar, em vez de ler `categories, language` de todas as linhas a cada visita.

#### 6. Otimizar a página de detalhes

Busque o livro pelo `id` no banco. Para “livros semelhantes”, filtre por categorias no banco ou mostre uma quantidade limitada. Hoje o detalhe baixa tudo e calcula similaridade em JavaScript.

#### 7. Revisar a paginação da busca

O limite de 20 já é bom. Para catálogos muito grandes, considere paginação por cursor/keyset usando `created_at` e `id`, em vez de `range` com offsets altos. Avalie trocar `count: 'exact'` por uma contagem estimada ou executá-la apenas quando necessária.

Adicione índices no Supabase para os filtros e ordenação mais usados. Para busca textual, use uma coluna `tsvector`/índice full-text ou uma solução de busca dedicada; vários `ILIKE '%termo%'` tendem a ficar lentos.

#### 8. Virtualizar listas administrativas

Dashboard, etiquetas e tabelas de importação podem renderizar centenas de elementos. Use paginação visual ou virtualização (`@tanstack/react-virtual`, por exemplo) para montar somente os itens visíveis.

### P2 — acabamento de experiência

#### 9. Melhorar imagens

- Adicionar `loading="lazy"` às capas fora da primeira tela.
- Adicionar `decoding="async"`.
- Definir dimensões/aspect ratio para evitar mudança de layout.
- Gerar thumbnails menores no upload e usar URLs transformadas do Storage quando disponível.
- Usar `srcSet`/`sizes` para celulares.

Não aplique lazy loading à imagem principal visível imediatamente; ela deve carregar com prioridade normal.

#### 10. Cache de dados

Use React Query/SWR, ou um cache simples, para não buscar o mesmo catálogo várias vezes ao navegar entre Home, categorias e detalhes. Configure `staleTime` para dados que mudam pouco.

#### 11. Estados de carregamento

Use skeletons em vez de deixar áreas vazias. Isso não reduz o tempo real, mas melhora bastante a percepção de velocidade. Desabilite ações durante chamadas e mostre erro/retry de forma consistente.

#### 12. Importação Excel

O arquivo Excel deve ser lido apenas quando a tela de importação for aberta. Depois, limite o número de linhas por lote e processe em blocos para evitar travar a aba com planilhas grandes.

## Ordem sugerida de implementação

1. Lazy-load das rotas e remover `select('*')` das listagens.
2. Debounce/cancelamento da busca.
3. Home com `limit(4)` e detalhe por `id`.
4. Imagens com dimensões, lazy loading e thumbnails.
5. Cache de dados.
6. Índices/queries SQL e virtualização quando o acervo crescer.

## Verificações recomendadas

Após cada etapa, medir com Chrome DevTools Lighthouse e Network:

- tamanho do JavaScript inicial;
- tempo até conteúdo principal (LCP);
- número de requisições ao navegar;
- tamanho das respostas Supabase;
- tempo de busca digitando rapidamente;
- comportamento com 1.000+ livros simulados.

## Resultado desta revisão

`npm run lint` e `npm run build` estavam passando durante a revisão. O build ainda informa chunk grande, portanto o primeiro trabalho recomendado é dividir as rotas e retirar o carregamento inicial das ferramentas administrativas.

