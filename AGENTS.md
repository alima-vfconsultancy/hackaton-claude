# Instruções para agentes de IA

Este arquivo existe por convenção (algumas ferramentas de IA procuram
`AGENTS.md` em vez de `CLAUDE.md`). Ele não duplica conteúdo: **a fonte única
de verdade para agentes é [`CLAUDE.md`](./CLAUDE.md)**, complementada por:

- [`docs/architecture.md`](./docs/architecture.md) — camadas e regras de dependência.
- [`docs/development-process.md`](./docs/development-process.md) —
  papéis (coordenador / executor / revisor independente), TDD obrigatório,
  gate de aprovação humana antes de codar.
- [`docs/coding-standards.md`](./docs/coding-standards.md) — nomenclatura e idioma.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branches, commits, PRs, releases.

Qualquer agente (Claude Code, Codex, outro) que for alterar este repositório
deve ler `CLAUDE.md` e os documentos acima **antes** de escrever código.

Regras de branch/commit/PR/merge estão em `CONTRIBUTING.md` e
`docs/development-process.md` — nenhum agente pode contorná-las.
