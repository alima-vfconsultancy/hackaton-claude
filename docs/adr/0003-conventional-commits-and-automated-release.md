# ADR-0003: Conventional Commits + release automático (tag + changelog)

## Status

Aceito

## Contexto

Com 5 desenvolvedores/agentes commitando em paralelo, precisamos de uma
forma objetiva de saber o que mudou entre versões e de gerar o número de
versão de forma consistente e rastreável, sem depender de alguém lembrar de
atualizar `package.json` manualmente. Não há, por ora, necessidade de
publicar em um registry nem de pipeline de deploy — a necessidade é apenas
versionamento (tag) e changelog automáticos a partir do histórico de commits.

## Decisão

- Adotar [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
  para toda mensagem de commit, em inglês (ver `CONTRIBUTING.md`).
- Usar `commitlint` + hook `commit-msg` (Husky) para rejeitar commits fora do
  padrão localmente.
- Usar `semantic-release` em modo "somente versionamento": ao mesclar na
  `main`, uma GitHub Action roda `semantic-release`, que analisa os commits
  desde a última tag, decide o tipo de bump (`fix` → patch, `feat` → minor,
  `BREAKING CHANGE`/`!` → major), atualiza `CHANGELOG.md`, cria a tag Git e
  uma Release no GitHub. `npmPublish` fica desativado — não publicamos
  pacote, só versionamos.
- Título de Pull Request também segue Conventional Commits (verificado por
  Action), pois normalmente é a mensagem de commit do squash-merge.

## Consequências

- Versão deixa de ser uma decisão manual; fica 100% derivada do que foi
  commitado, reduzindo divergência entre o changelog e a realidade.
- Exige que todo mundo (humano e agente) escreva o tipo certo de commit
  (`fix:`, `feat:`, `chore:`, etc.) — isso é verificado automaticamente, não
  por boa vontade.
- Se, no futuro, o projeto ganhar deploy automatizado, basta adicionar um
  novo workflow/step disparado pelo mesmo evento de release — este ADR não
  precisa ser revisto, só estendido.
