# Instruções para agentes de IA

Este arquivo existe por convenção (algumas ferramentas de IA procuram
`AGENTS.md` em vez de `CLAUDE.md`). Ele não duplica conteúdo: **a fonte única
de verdade para agentes é [`CLAUDE.md`](./CLAUDE.md)**, complementada por:

- [`docs/arquitetura.md`](./docs/arquitetura.md) — camadas e regras de dependência.
- [`docs/processo-de-desenvolvimento.md`](./docs/processo-de-desenvolvimento.md) —
  papéis (coordenador / executor / revisor independente), TDD obrigatório,
  gate de aprovação humana antes de codar.
- [`docs/padroes-de-codigo.md`](./docs/padroes-de-codigo.md) — nomenclatura e idioma.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branches, commits, PRs, releases.

Qualquer agente (Claude Code, Codex, outro) que for alterar este repositório
deve ler `CLAUDE.md` e os documentos acima **antes** de escrever código.

Regra que nenhum agente pode contornar: **agentes nunca dão merge, nunca
fazem push direto para `main` e nunca fazem `--force` em branches
compartilhadas.** Agentes criam branch, commitam, abrem Pull Request e param.
Um humano revisa e faz o merge manualmente.
