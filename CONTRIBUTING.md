# Como contribuir

Este guia vale tanto para humanos quanto para agentes de IA (Claude Code e
similares) trabalhando neste repositório. Leia também `CLAUDE.md` (contexto
de produto/regras de segurança), `docs/architecture.md` (camadas) e
`docs/development-process.md` (fluxo completo com plano aprovado,
TDD e revisor independente).

## Antes de codar

Nenhum código é escrito sem um Plano de Entrega aprovado
(`docs/templates/delivery-plan.md`). Ver `docs/development-process.md`.

## Branches

- `main` é a única branch protegida/estável. Ninguém commita direto nela.
- Toda tarefa começa uma branch a partir de `main` atualizada, com o nome:

  ```
  <tipo>/<slug-em-ingles-curto>
  ```

  onde `<tipo>` é um dos tipos de Conventional Commits (`feat`, `fix`,
  `chore`, `refactor`, `test`, `docs`, `perf`, `build`, `ci`) e o slug
  descreve a tarefa em inglês, kebab-case. Exemplos:

  ```
  feat/dose-snooze-notification
  fix/ics-timezone-offset
  docs/pdf-export-accessibility-notes
  ```

- **Antes de abrir a PR**, a branch precisa estar com `main` mesclado/rebaseado
  e **sem conflitos**:

  ```bash
  git fetch origin
  git merge origin/main   # ou: git rebase origin/main
  # resolver conflitos localmente, rodar testes de novo
  git push
  ```

- Agentes **nunca** fazem merge da própria PR, nunca fazem push direto em
  `main`, nunca usam `--force` em uma branch compartilhada. Só abrem a PR e
  aguardam revisão humana.

## Commits — Conventional Commits (em inglês)

Formato:

```
<type>(<scope opcional>): <descrição curta no imperativo>

<corpo opcional explicando o porquê>

<rodapé opcional: BREAKING CHANGE: ..., Refs: #123>
```

Tipos usados neste projeto:

| Tipo       | Quando usar                                                   |
|------------|----------------------------------------------------------------|
| `feat`     | nova funcionalidade visível para o usuário                    |
| `fix`      | correção de bug                                                |
| `docs`     | só documentação (README, CLAUDE.md, docs/, comentários)        |
| `test`     | só testes, sem mudança de comportamento                        |
| `refactor` | mudança interna sem alterar comportamento externo              |
| `perf`     | melhoria de performance                                        |
| `build`    | dependências, bundler, configuração de build                   |
| `ci`       | pipelines, workflows do GitHub Actions                          |
| `chore`    | manutenção que não se encaixa acima                             |

Exemplos:

```
feat(schedule): support interval doses crossing midnight
fix(ocr): keep decimal comma when parsing dosage in mg
docs: add architecture decision record for layered design
```

Commit com mudança incompatível: use `!` depois do tipo/escopo ou um rodapé
`BREAKING CHANGE:` — isso vira bump de versão **major** no release
automático.

Commits são validados localmente por `commitlint` (hook `commit-msg` via
Husky) e, para PRs, o título também é validado por uma Action — como PRs
normalmente são mescladas via *squash*, o título da PR vira a mensagem de
commit final em `main`.

## Pull Requests

- Título: Conventional Commit, em inglês (mesma regra dos commits).
- Descrição: use `.github/PULL_REQUEST_TEMPLATE.md`, em português, apontando
  para o Plano de Entrega correspondente.
- **Nunca cole trechos de conversa com o agente de IA na descrição da PR.**
  Se a informação for relevante, reescreva como texto que qualquer pessoa de
  fora entenderia sem ter visto o chat (o que foi feito, por quê, como
  testar) — nunca "conforme conversamos" ou prompts colados.
- A PR só é aberta depois que o agente revisor independente aprovou o
  trabalho (ver `docs/development-process.md`).
- CI (`.github/workflows/ci.yml`) precisa estar verde: typecheck, testes e
  build.
- Merge é sempre manual, feito por um humano, depois de revisão humana.

## Versionamento e release

Este projeto usa [Conventional Commits](https://www.conventionalcommits.org/)
+ [`semantic-release`](https://github.com/semantic-release/semantic-release)
apenas para **versionamento e changelog** (sem publicação em registry, sem
deploy — ver ADR-0003). Ao mesclar em `main`:

1. A Action `.github/workflows/release.yml` roda `semantic-release`.
2. Ele analisa os commits desde a última tag.
3. Decide a próxima versão: `fix` → patch (`2.0.0` → `2.0.1`), `feat` → minor
   (`2.0.1` → `2.1.0`), `BREAKING CHANGE`/`!` → major (`2.1.0` → `3.0.0`).
4. Atualiza `CHANGELOG.md`, cria a tag Git (`vX.Y.Z`) e publica uma Release
   no GitHub com as notas geradas.

Nenhum passo de release é manual — se o `package.json` mostra uma versão,
ela é só o último valor gravado pelo bot de release, nunca editada à mão.

## Rodando localmente antes de qualquer commit

```bash
npm run build   # typecheck + build
npm test        # Vitest
```

Ambos precisam passar. Se não passarem, o commit/PR não está pronto.
