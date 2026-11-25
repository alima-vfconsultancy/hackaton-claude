# ADR-0001: Arquitetura em camadas pragmática (Clean Architecture / DDD-lite)

## Status

Aceito. O layout de pastas foi detalhado e substituído pelo [ADR-0004](./0004-explicit-layer-folders.md).

## Contexto

O MeuRemédio é um PWA client-only (sem backend). O código inicial organiza
tudo por "tipo técnico" (`components/`, `pages/`, `lib/`, `db/`), sem uma
regra explícita de dependência entre essas pastas. Sem essa regra, a lógica
de negócio vaza para componentes React, e componentes React importam
Dexie/Tesseract/jsPDF diretamente — dificultando teste e revisão.

DDD "completo" (bounded contexts, agregados, event sourcing) é
desproporcional para um app client-only de um único domínio pequeno.

## Decisão

Adotar 4 camadas conceituais com regra de dependência em uma única direção:
`presentation → application → domain`, com `infrastructure` implementando
adaptadores usados pela camada `application`. Ver detalhamento em
[`docs/architecture.md`](../architecture.md).

Mapeamento para as pastas já existentes (sem necessidade de migração
imediata): `domain` ≈ `src/types.ts`; `application` ≈ `src/lib/` (lógica
pura); `infrastructure` ≈ `src/db/` + módulos de `src/lib/` que encapsulam
Dexie/Tesseract/jsPDF/Notification API; `presentation` ≈ `src/components/`,
`src/pages/`, `src/hooks/`.

## Consequências

- Fica mais fácil testar: `domain` e a parte pura de `application` não
  dependem de React nem de IndexedDB, então os testes Vitest não precisam de
  mocks pesados.
- Fica mais fácil revisar: o agente revisor independente tem uma regra
  objetiva ("essa camada pode importar aquela?") em vez de um julgamento
  subjetivo de "está organizado".
- Custo: exige disciplina para não importar bibliotecas externas direto em
  componentes — isso é verificado na revisão independente (ver
  `docs/development-process.md`).
- Se o projeto ganhar backend/sincronização, esta decisão deve ser revisitada
  em um novo ADR.
