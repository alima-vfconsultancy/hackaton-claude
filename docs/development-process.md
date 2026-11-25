# Processo de desenvolvimento (multiagente)

Este projeto é construído por 5 desenvolvedores que trabalham **exclusivamente
através de agentes de IA** (Claude Code ou equivalente). Para isso não virar
caos, todo trabalho segue o fluxo abaixo. Nenhuma etapa é opcional.

## Papéis

- **Humano (dono da tarefa)** — escreve ou aprova o Plano de Entrega antes de
  qualquer código ser escrito, e faz o merge final da PR. É a única pessoa
  autorizada a aprovar escopo e a mesclar código em `main`.
- **Agente coordenador** — recebe o Plano de Entrega aprovado, quebra em
  tarefas pequenas e, quando fizer sentido, despacha subagentes executores
  (ex.: `delegate_task`/subagentes do Claude Code). Garante que cada tarefa
  tem critério de aceite claro antes de ser implementada.
- **Agente(s) executor(es)** — implementam **uma tarefa por vez** seguindo
  TDD estrito (skill `test-driven-development`): teste falha primeiro,
  código mínimo, teste passa, refatora. Nunca escrevem código de produção
  sem um teste falhando antes.
- **Agente revisor independente** — roda em um contexto **novo e isolado**,
  sem acesso ao histórico de chat usado para implementar a tarefa. Recebe
  apenas: (a) o Plano de Entrega aprovado, (b) o diff/PR, (c) o repositório.
  Compara o que foi implementado contra o que foi **aprovado no plano** —
  não contra o que "parecia" ter sido pedido na conversa. Produz um veredito
  objetivo (aprova / reprova com lista de problemas).

## Fluxo passo a passo

### 1. Planejar (gate humano obrigatório)

Antes de qualquer linha de código, preencha
[`docs/templates/delivery-plan.md`](./templates/delivery-plan.md) com:
objetivo, escopo dentro/fora, critérios de aceite verificáveis, arquivos/
camadas afetadas (ver `docs/architecture.md`), plano de testes e riscos.

O plano é aprovado explicitamente pelo humano responsável (nome + data no
próprio documento, ou aprovação registrada na issue/PR). **Nenhum agente
começa a implementar sem essa aprovação registrada.** Isso é o que garante
que o agente revisor independente tenha uma especificação objetiva para
comparar — e não a conversa informal que gerou o pedido.

### 2. Coordenar e quebrar em tarefas

O agente coordenador divide o plano aprovado em tarefas pequenas e
verticais (uma fatia de comportamento ponta a ponta por vez — ver skill
`test-driven-development`, seção "Avoid Horizontal Slices"). Cada tarefa deve
caber em uma branch e uma PR.

### 3. Implementar com TDD

Cada agente executor segue o ciclo RED → GREEN → REFACTOR da skill
`test-driven-development` para cada tarefa:

1. Escreve um teste Vitest que falha pelo motivo certo.
2. Roda o teste e confirma a falha (`npm test`).
3. Escreve o código mínimo para passar.
4. Roda o teste e confirma que passa, roda a suíte completa.
5. Refatora mantendo os testes verdes.

Bug encontrado? Segue a skill `systematic-debugging`: reproduz com um teste
que falha antes de propor qualquer correção.

### 4. Autoverificação antes de abrir PR

Antes de pedir revisão, o próprio agente executor roda a skill
`requesting-code-review` (diff, varredura de segredos/injeção, testes,
build, checklist) e só segue adiante se tudo passar.

### 5. Revisão independente

Um agente revisor, em contexto novo (sem o histórico da implementação),
recebe **apenas**:

- O Plano de Entrega aprovado (passo 1).
- O diff da branch/PR.
- Acesso ao repositório para rodar testes/build.

Ele verifica, objetivamente:

- O que foi implementado corresponde ao escopo e aos critérios de aceite do
  plano (nem menos, nem "bônus" fora de escopo).
- Regras de dependência entre camadas foram respeitadas (`docs/architecture.md`).
- TDD foi seguido (existem testes para o comportamento novo; eles passam).
- Sem segredos, sem vazamento de contexto de chat na descrição da PR
  (regra completa em `CONTRIBUTING.md`).
- Nomenclatura e idioma seguem `docs/coding-standards.md`.

Veredito registrado como comentário na PR. Reprovado → volta para o passo 3
com a lista objetiva de problemas (máximo de 2 ciclos de correção automática
antes de escalar para o humano, conforme `requesting-code-review`).

### 6. Pull Request

Só depois do veredito de aprovação o agente abre a PR (ou atualiza a PR já
aberta), usando o template de `.github/PULL_REQUEST_TEMPLATE.md` (formato de
título/descrição e regra de não colar conversa: ver `CONTRIBUTING.md` →
"Pull Requests").

A branch precisa estar **sem conflitos e atualizada com `main`** antes de
abrir a PR (ver `CONTRIBUTING.md` → "Branches").

### 7. Merge (humano) e release (automático)

O agente **nunca** faz merge nem push direto em `main`. Um humano revisa e
mescla manualmente. Ao mesclar, a pipeline de release (`.github/workflows/release.yml`)
analisa os commits desde a última tag e cria automaticamente a próxima versão
(tag + changelog + release no GitHub), conforme Conventional Commits — ver
`CONTRIBUTING.md` → "Versionamento e release".

## Resumo visual

```
Plano de Entrega (humano aprova)
        │
        ▼
Coordenador quebra em tarefas
        │
        ▼
Executor: RED → GREEN → REFACTOR (TDD)  ──┐
        │                                  │ (bug) systematic-debugging
        ▼                                  │
Autoverificação (requesting-code-review)   │
        │                                  │
        ▼                                  │
Revisor independente (contexto novo) ──reprovado──> volta para Executor
        │ aprovado
        ▼
Pull Request (branch atualizada, sem conflitos)
        │
        ▼
Humano revisa e mescla em main
        │
        ▼
Release automático (semantic-release, tag + changelog)
```
