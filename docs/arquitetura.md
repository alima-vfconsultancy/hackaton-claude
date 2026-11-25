# Arquitetura

## Contexto

O MeuRemédio é um PWA client-only: sem backend, sem API própria, toda a
persistência é local (IndexedDB via Dexie). Não existe hoje uma camada de
servidor, então frameworks pesados de DDD orientados a sistemas distribuídos
(agregados, bounded contexts múltiplos, event sourcing) seriam exagero. Ao
mesmo tempo, "jogar tudo em `components/`" não escala para 5 desenvolvedores
trabalhando em paralelo via agentes de IA.

Decisão (ver [`docs/adr/0001-arquitetura-em-camadas.md`](./adr/0001-arquitetura-em-camadas.md)):
adotar uma **arquitetura em camadas pragmática, inspirada em Clean
Architecture / DDD-lite**, com regra de dependência em uma única direção.

## Camadas

```
presentation  →  application  →  domain
                      ↑
                 infrastructure
```

- **Domain** (`src/domain/`, hoje também `src/types.ts`)
  Entidades e tipos puros: `Medication`, `DoseLog`, `Settings`, enums e
  invariantes do negócio. Zero import de React, Dexie, Tesseract, jsPDF ou
  qualquer API de navegador. 100% síncrono e testável sem mocks.

- **Application** (`src/lib/`)
  Casos de uso e regras de negócio que orquestram o domínio: geração de
  agenda de doses (`schedule.ts`), interpretação do texto do OCR
  (`prescriptionParser.ts`), cálculo de doses perdidas/encerramento de
  tratamento (`maintenance.ts`), taxa de adesão (`adherence.ts`), formatação
  pt-BR (`format.ts`). Função pura sempre que possível: entrada → saída,
  sem efeito colateral. É a camada com a maior cobertura de testes Vitest.

- **Infrastructure** (`src/db/`, e os módulos de `src/lib/` que encapsulam
  APIs externas: `ocr.ts`, `pdf.ts`, `ics.ts`, `notifications.ts`,
  `imagePreprocess.ts`, `backup.ts`, `download.ts`)
  Adaptadores para o mundo exterior: Dexie (IndexedDB), Tesseract.js, jsPDF,
  Web Notifications/Service Worker, Canvas, download de arquivo. Implementam
  a "porta" que a camada de aplicação precisa, escondendo a biblioteca
  concreta por trás de uma função com assinatura própria do domínio.

- **Presentation** (`src/components/`, `src/pages/`, `src/hooks/`, `App.tsx`,
  `main.tsx`)
  React. Só conhece `application` e `domain` — nunca importa `dexie`,
  `tesseract.js` ou `jspdf` diretamente; passa sempre por `src/lib` ou
  `src/db`.

## Regra de dependência

1. `domain` não depende de nada do projeto.
2. `application` (`src/lib`) pode depender de `domain`. Pode depender de
   `infrastructure` apenas através de uma função/porta exportada (nunca
   importando a biblioteca externa diretamente dentro da lógica de negócio
   pura — a chamada à lib externa fica isolada no próprio arquivo de
   infraestrutura).
3. `infrastructure` pode depender de `domain` e de bibliotecas externas.
4. `presentation` pode depender de `application`, `domain` e dos hooks em
   `src/hooks`. Nunca importa Dexie/Tesseract/jsPDF diretamente.
5. Nenhuma camada inferior importa uma camada superior (ex.: `src/lib` nunca
   importa de `src/components`).

Violação dessa regra é motivo de reprovação no revisor independente (ver
[`docs/processo-de-desenvolvimento.md`](./processo-de-desenvolvimento.md)).

## Nota sobre a estrutura atual

O código já criado reaproveita os nomes de pasta `lib/` e `db/` em vez de
`application/` e `infrastructure/` explícitos — isso é aceitável, pois o
mapeamento conceitual acima já se aplica. Não é necessário renomear pastas
existentes só por causa deste documento. Para código **novo**:

- Lógica pura e testável sem React → `src/lib/`.
- Qualquer coisa que toque Dexie, Tesseract, jsPDF, Web APIs (canvas,
  notification, file download) → mantenha isolado em um módulo próprio
  dentro de `src/lib/` ou `src/db/`, nunca espalhado dentro de componentes.
- Um módulo de `src/lib/` que hoje mistura lógica pura com chamada a uma lib
  externa deve, ao ser tocado, ser separado em duas funções (uma pura, uma
  adaptadora) — não é obrigatório migrar tudo de uma vez, mas é obrigatório
  não piorar o que for tocado.

## Diagrama de pastas (alvo)

```
src/
  domain/            # (ou types.ts) entidades, enums, invariantes — sem deps externas
  lib/                # application layer: casos de uso + adaptadores de infra isolados
  db/                 # infrastructure: Dexie (schema + repositório)
  components/         # presentation: UI reutilizável
  pages/              # presentation: uma tela por arquivo
  hooks/              # presentation: hooks de estado/efeito
  App.tsx, main.tsx    # bootstrap
```

## Quando revisar esta decisão

Se o projeto ganhar um backend (ex.: sincronização entre dispositivos), este
documento deve ser atualizado e um novo ADR deve registrar a mudança — não
edite este arquivo retroativamente sem um ADR correspondente.
