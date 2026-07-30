# Auditoria geral de segurança — BibliASPA

**Data:** 2026-07-29  
**Escopo:** revisão estática do frontend React/Vite, API Express/Vercel, integração Supabase, configuração e dependências.  
**Status:** diagnóstico; nenhuma correção de código foi aplicada nesta auditoria.

## Resumo executivo

Há um risco crítico: o acesso administrativo não é uma autenticação real. As senhas estão no JavaScript entregue ao navegador e o estado de acesso é controlado por `sessionStorage`, que qualquer usuário pode alterar pelo DevTools. Além disso, as políticas RLS do banco permitem `INSERT`, `UPDATE` e `DELETE` para o papel público. Portanto, uma pessoa pode ignorar completamente a tela de login e alterar ou apagar o catálogo usando chamadas diretas ao Supabase.

Também existem riscos altos nos endpoints Gemini: estão públicos, sem autenticação, rate limiting ou limite explícito de tamanho do corpo. Isso permite abuso da chave Gemini, custos inesperados e envio de grandes volumes de dados para um serviço externo.

## Achados priorizados

| ID | Severidade | Achado | Evidência |
|---|---|---|---|
| SEC-01 | **Crítica** | Autenticação administrativa falsa e credenciais expostas no bundle | `src/components/layout/AdminLayout.tsx:17-25` compara senhas fixas no cliente e grava `adminLevel` em `sessionStorage`. |
| SEC-02 | **Crítica** | Qualquer visitante pode inserir, editar e excluir livros | `database_schema.sql:36-51` usa `TO public` e `USING/WITH CHECK (true)` para todas as operações de escrita. |
| SEC-03 | **Alta** | Autorização baseada somente em UI | `AdminLayout`, `Dashboard`, `AddBook` e `BulkImport` escondem menus, mas as chamadas Supabase continuam sendo executáveis diretamente pelo navegador. |
| SEC-04 | **Alta** | Endpoints Gemini sem autenticação, rate limit ou quotas | `server.ts` e `api/index.ts` expõem quatro rotas POST públicas. A chave é protegida no servidor, mas pode ser usada abusivamente por qualquer pessoa. |
| SEC-05 | **Alta** | Falta de limite de tamanho e validação rigorosa de entrada | `express.json()` é usado sem `limit`; os endpoints interpolam `book`, `books`, `text` e `query` em prompts. |
| SEC-06 | **Média** | Informações internas de erro podem ser devolvidas ao cliente | Os `catch` retornam `error.message` diretamente em `server.ts` e `api/index.ts`. |
| SEC-07 | **Média** | Cabeçalhos de segurança não configurados | Não há Helmet, CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` ou política equivalente em `server.ts`, `api/index.ts` ou `vercel.json`. |
| SEC-08 | **Média** | Chave/configuração Supabase possui fallback hardcoded | `src/lib/supabase.ts` contém URL e anon key reais como fallback. A anon key pode ser pública por design, mas o fallback dificulta rotação e configuração segura; o problema grave é a RLS permissiva. |
| SEC-09 | **Média** | Upload de imagens precisa de validação no servidor | `src/pages/admin/Dashboard.tsx:634-656` faz upload pelo cliente; a segurança depende integralmente das políticas do bucket e validações do Supabase. |
| SEC-10 | **Baixa/Média** | Dependências não puderam ser auditadas online nesta execução | `npm run lint` passou. `npm audit --omit=dev` falhou por indisponibilidade DNS do registry (`EAI_AGAIN`); não é evidência de ausência de vulnerabilidades. |

## Impacto provável

- Exclusão ou adulteração completa do acervo.
- Inserção de conteúdo malicioso ou spam no catálogo.
- Consumo da cota/custo da API Gemini e possível indisponibilidade.
- Exposição de dados de catálogo enviados aos endpoints Gemini.
- Aumento do risco de XSS caso conteúdo importado passe a ser renderizado como HTML no futuro.

## Plano de correção recomendado

### P0 — antes de disponibilizar o app

1. Remover as duas senhas do frontend e descontinuar `adminAuth`/`adminLevel` em `sessionStorage`.
2. Ativar Supabase Auth, exigir sessão válida e usar autorização no banco, por exemplo `auth.uid()` e uma tabela de perfis/roles. O papel `full` deve ser decidido no banco, nunca pelo cliente.
3. Substituir as políticas de escrita por políticas para `authenticated` e por role administrativa. Manter `SELECT` público apenas se essa for a intenção do produto.
4. Revogar e rotacionar imediatamente qualquer credencial administrativa que tenha sido usada no código. Confirmar no histórico Git se houve publicação de segredos.
5. Proteger as rotas Gemini com sessão/admin authorization, rate limiting por IP/usuário e quota diária.

### P1 — endurecimento da API

1. Usar `express.json({ limit: "256kb" })` e limites menores por endpoint; limitar quantidade de livros e tamanho de `text`/campos.
2. Validar payloads com schema (Zod, Valibot ou JSON Schema) e rejeitar campos inesperados.
3. Não retornar `error.message` externo; registrar detalhes no servidor e devolver erro genérico com um request ID.
4. Adicionar Helmet/CSP, HSTS somente em HTTPS, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e CORS restritivo quando aplicável.
5. Configurar timeouts, tratamento de abort/cancelamento e limites de concorrência para chamadas Gemini.

### P2 — operação e cadeia de dependências

1. Rodar `npm audit`, `npm outdated` e atualizar o lockfile em CI com dependências fixadas/revisadas.
2. Adicionar CI para `npm run lint`, build, secret scanning e dependabot/renovate.
3. Criar backups do Supabase e trilha de auditoria para inserção, edição, exclusão e uploads.
4. Verificar políticas dos buckets `images` e `book-thumbnails`: leitura pública somente quando necessária; escrita autenticada/admin; tipo MIME, tamanho e nomes de arquivo controlados.
5. Adicionar testes de autorização: visitante não pode escrever; usuário autenticado comum não pode executar operações `full`.

## Validações realizadas

- `npm run lint` (`tsc --noEmit`): **passou**.
- `npm audit --omit=dev --json`: **não concluído**, pois o registry npm não estava acessível nesta execução (`EAI_AGAIN`). Executar novamente com conectividade.
- Revisão estática de rotas, autenticação, RLS, configuração e chamadas de persistência: concluída.

## Critério de pronto

Considerar o app minimamente seguro quando: não houver segredo/senha no cliente; todas as escritas forem negadas por RLS sem sessão autorizada; as rotas Gemini exigirem autorização e limites; uploads forem restringidos; e os testes de autorização passarem em CI.

