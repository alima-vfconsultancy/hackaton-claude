# ADR-0002: Processo multiagente com plano aprovado, TDD e revisor independente

## Status

Aceito

## Contexto

Todo o código deste projeto é escrito por agentes de IA (Claude Code ou
equivalente), operados por 5 desenvolvedores diferentes. Sem um processo
explícito, cada agente define seu próprio nível de rigor, não há garantia de
que o código corresponde ao que foi pedido (em vez do que o agente
"entendeu" de uma conversa informal), e não há segunda opinião antes do
merge.

## Decisão

1. Nenhuma tarefa começa sem um Plano de Entrega (`docs/templates/delivery-plan.md`)
   aprovado explicitamente por um humano. Esse plano — não o histórico de
   chat — é a especificação contra a qual o trabalho é validado depois.
2. Implementação segue TDD estrito (skill `test-driven-development`):
   nenhum código de produção sem teste falhando antes.
3. Antes de abrir PR, um agente revisor roda em **contexto isolado**, sem o
   histórico da conversa de implementação, recebendo apenas o plano aprovado
   e o diff. Ele valida aderência ao escopo, às regras de arquitetura
   (ADR-0001) e aos padrões de código, e pode reprovar com lista objetiva de
   problemas.
4. Agentes nunca mesclam PRs nem dão push direto em `main`. Mesclagem é
   sempre uma ação humana.

Detalhamento completo em
[`docs/development-process.md`](../development-process.md).

## Consequências

- Reduz o risco de "o agente entendeu errado e ninguém percebeu" — a
  especificação escrita e aprovada vira o padrão de comparação, não a
  conversa.
- Adiciona uma etapa de planejamento antes de codar, que pode parecer
  mais lenta no início; o ganho é menos retrabalho e menos PRs reprovadas
  tarde no processo.
- Exige que o humano responsável realmente leia e aprove o plano — se essa
  etapa virar um carimbo automático, o processo perde o valor.
