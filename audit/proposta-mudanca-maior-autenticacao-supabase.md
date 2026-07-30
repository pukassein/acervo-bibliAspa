# Proposta de mudança maior: autenticação real e permissões no banco

**Status:** aguardando aprovação  
**Escopo desta proposta:** análise e plano; nenhuma mudança será implementada sem aprovação.

## Recomendação

Substituir o login administrativo atual, feito inteiramente no navegador, por:

1. Supabase Auth para login e sessão.
2. Uma tabela de perfis/roles para diferenciar administradores normais e completos.
3. Políticas RLS que permitam alterações somente a usuários autorizados.
4. Verificação de autorização também nas rotas Gemini e uploads.

Esta é a mudança mais importante porque corrige a base de segurança do app. Melhorias de UI ou performance não resolvem o problema atual: qualquer pessoa ainda poderia chamar o Supabase diretamente e inserir, alterar ou excluir livros.

## Problema atual

Hoje o app compara senhas fixas no JavaScript e grava `adminLevel` em `sessionStorage`. Isso não é uma barreira de segurança: o usuário pode ver as senhas no bundle, alterar o `sessionStorage` e chamar as APIs diretamente.

Além disso, `database_schema.sql` permite `INSERT`, `UPDATE` e `DELETE` para `public` com `true`. Assim, mesmo que a tela administrativa pareça protegida, o banco não exige autenticação.

## Como ficaria

```text
Usuário faz login
        ↓
Supabase Auth cria sessão segura
        ↓
Frontend envia token nas chamadas
        ↓
RLS consulta auth.uid() + role
        ↓
Banco aceita ou rejeita a operação
```

O frontend continuaria controlando apenas a experiência visual. A decisão real de “pode editar?”, “pode apagar?” ou “pode importar em lote?” ficaria no servidor/banco.

## Permissões propostas

| Perfil | Ver acervo | Adicionar/editar | Excluir | Importação AI/Excel |
|---|---:|---:|---:|---:|
| Visitante | Sim | Não | Não | Não |
| Admin normal | Sim | Sim | Não ou conforme decisão | Não |
| Admin completo | Sim | Sim | Sim | Sim |

## Benefícios

- Impede alterações anônimas diretamente pelo Supabase.
- Remove senhas administrativas do código enviado ao navegador.
- Permite revogar usuários sem alterar o frontend.
- Permite adicionar mais administradores com segurança.
- Protege também APIs Gemini e uploads.
- Cria uma base correta para auditoria e histórico de alterações.

## Mudanças previstas

### Frontend

- Trocar o formulário de senha por login Supabase Auth.
- Usar `onAuthStateChange` para reagir a login/logout.
- Remover `adminAuth` e `adminLevel` do `sessionStorage`.
- Buscar o perfil/role do usuário autenticado.
- Redirecionar usuários não autorizados.
- Esconder menus apenas como conveniência visual; a proteção real ficará no RLS.

### Banco Supabase

- Criar tabela `profiles` ligada a `auth.users`.
- Criar role controlada no banco, sem permitir que o usuário comum altere a própria role.
- Manter leitura pública de livros, se essa continuar sendo a intenção.
- Remover as policies públicas de escrita.
- Criar policies de insert/update/delete baseadas em `auth.uid()` e role.
- Revisar policies dos buckets de imagens.

### API

- Verificar o JWT Supabase nas rotas `/api/gemini/*`.
- Exigir role adequada para importação e enriquecimento.
- Manter rate limiting e limites de payload já adicionados.
- Retornar erro genérico para usuários não autorizados.

## Plano de migração sem perder o acervo

1. Criar as tabelas e policies novas sem remover imediatamente as antigas.
2. Criar uma conta de administrador completo e testar login em ambiente de teste.
3. Atualizar o frontend para usar a sessão real.
4. Testar visitante, admin normal e admin completo.
5. Testar chamadas diretas ao Supabase com sessão anônima e confirmar que escritas falham.
6. Ativar as policies restritivas.
7. Remover as senhas antigas e o código de `sessionStorage`.
8. Rotacionar qualquer credencial administrativa que tenha sido compartilhada ou publicada.

## Riscos e cuidados

- Durante a migração, uma policy pode bloquear a aplicação se for ativada antes do frontend estar pronto.
- Será necessário configurar usuários no painel Supabase.
- Se o projeto não tiver e-mail configurado, pode ser necessário usar convite ou magic link.
- A anon key continuará aparecendo no frontend; isso é esperado. Ela não deve possuir permissões de escrita sem uma sessão autorizada.
- Deve existir pelo menos uma conta admin completo testada antes de remover o login antigo.

## Critérios para aprovar a entrega

- Visitante consegue ver e pesquisar o catálogo.
- Visitante não consegue inserir, editar ou excluir via UI nem via chamada direta.
- Admin normal consegue executar somente suas operações.
- Admin completo consegue importar e administrar o catálogo.
- Logout invalida a sessão no navegador.
- Rotas Gemini rejeitam chamadas sem sessão autorizada.
- Nenhuma senha administrativa aparece no código compilado.

## Decisão solicitada

**Aprovar esta mudança?**

Se aprovada, a implementação deverá ser feita em etapas e testada antes de ativar as policies finais do banco. Esta proposta não altera código nem banco por enquanto.

