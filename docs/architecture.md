# Arquitetura

## Contexto

O MeuRemédio é um PWA client-only: sem backend, sem API própria, toda a
persistência é local (IndexedDB via Dexie). Não existe hoje uma camada de
servidor, então frameworks pesados de DDD orientados a sistemas distribuídos
(agregados, bounded contexts múltiplos, event sourcing) seriam exagero. Ao
mesmo tempo, "jogar tudo em `components/`" não escala para múltiplos
desenvolvedores trabalhando em paralelo.

Decisão (ver [`docs/adr/0001-layered-architecture.md`](./adr/0001-layered-architecture.md)
e [`docs/adr/0004-explicit-layer-folders.md`](./adr/0004-explicit-layer-folders.md)):
adotar uma **arquitetura em camadas pragmática, inspirada em Clean
Architecture / DDD-lite**, com regra de dependência em uma única direção e
**uma pasta por camada**.

## Camadas

```
presentation  →  application  →  domain
                      ↑
                infrastructure          shared (textos pt-BR) → domain
```

- **Domain** (`src/domain/`)
  Entidades, tipos e regras de negócio puras: `Medication`, `MedicationDraft`,
  `Schedule`, `TreatmentPeriod`, `DoseLog`, `Settings`, geração de horários de
  dose (`schedule.ts`), regra de dose perdida (`dose.ts`), adesão
  (`adherence.ts`) e validação por **códigos** (sem texto de UI). Zero import
  de React, Dexie, Tesseract, jsPDF ou qualquer API de navegador. 100%
  síncrono e testável sem mocks.

- **Application** (`src/application/`)
  Casos de uso e **portas** (`ports.ts`): interfaces dos repositórios e dos
  serviços de dispositivo (`OcrEngine`, `PdfReportGenerator`,
  `ReminderNotifier`...). Contém os serviços (`medicationService`,
  `doseService`, `reminderService`, `backup`...), a rotina `syncDoses` e o
  `prescriptionParser`. Só conhece `domain` e `shared`; é testada com
  repositórios em memória (`application/testing`).

- **Infrastructure** (`src/infrastructure/`)
  Adaptadores que implementam as portas: Dexie (`persistence/dexie`),
  Tesseract.js (`ocr`), canvas (`imaging`), jsPDF (`pdf`), `.ics`
  (`calendar`), Web Notifications/Service Worker (`notifications`) e download
  de arquivo (`files`). É o **único** lugar que importa `dexie`,
  `tesseract.js`, `jspdf` ou usa APIs de navegador de I/O.

- **Presentation** (`src/presentation/`, `src/App.tsx`, `src/main.tsx`)
  React: `components/`, `pages/`, `hooks/`, `forms/` (estado dos formulários) e
  `i18n/` (mensagens pt-BR de erro). Só conhece `application`, `domain` e
  `shared`; chega aos adaptadores apenas pelo `app` exportado do composition
  root.

- **Shared** (`src/shared/ptBR/`)
  Textos e formatação em português do Brasil (rótulos de enum, aviso de
  segurança, datas, descrição de frequência). Existe porque tanto a UI quanto
  os adaptadores de saída (PDF, `.ics`, notificação) falam pt-BR. Só depende
  de `domain`.

- **Composition root** (`src/composition-root.ts`)
  Único arquivo que liga adaptadores às portas (`createApplication`) e exporta
  `app`. Não contém regra de negócio.

## Regra de dependência

1. `domain` não depende de nada do projeto.
2. `shared` pode depender de `domain`.
3. `application` pode depender de `domain` e `shared`. Nunca importa
   `infrastructure`: conversa com ela por portas (interfaces).
4. `infrastructure` pode depender de `application` (para implementar as
   portas), `domain`, `shared` e bibliotecas externas.
5. `presentation` pode depender de `application`, `domain` e `shared`, e do
   `composition-root` (para obter `app`). Nunca importa `infrastructure`,
   Dexie, Tesseract ou jsPDF. A única exceção de biblioteca é
   `dexie-react-hooks`, isolada em `presentation/hooks/useLiveData.ts`.
6. Nenhuma camada inferior importa uma camada superior (ex.: `domain` nunca
   importa de `application`).
7. `domain`, `shared` e `application` não usam globais de navegador
   (`window`, `document`, `navigator`, `Notification`, `import.meta`...).

Essas regras são verificadas automaticamente por `src/architecture.test.ts`
(roda em `npm test`). Violação também é motivo de reprovação no revisor
independente (ver [`docs/development-process.md`](./development-process.md)).

## Como adicionar código novo

- Regra de negócio sem I/O → `src/domain/` (ou `src/application/` se
  orquestra repositórios) **com teste Vitest ao lado**.
- Nova capacidade do dispositivo (câmera, compartilhamento, outra lib) →
  declare a porta em `application/ports.ts`, implemente em
  `infrastructure/<nome>/` e ligue em `composition-root.ts`.
- Tela ou componente → `src/presentation/`. Chame o `app`, nunca um adaptador.
- Texto em português visível ao usuário → JSX da presentation ou
  `presentation/i18n`; textos reutilizados por PDF/`.ics`/notificação →
  `shared/ptBR`. Domínio e aplicação devolvem códigos, não frases.
- Toda função **exportada** de `domain`, `application` e `infrastructure`
  tem TSDoc (ver [`docs/coding-standards.md`](./coding-standards.md)).

## Diagrama de pastas

```
src/
  domain/            # entidades, regras puras, validação por códigos
  application/       # casos de uso, portas, parser de receita (+ testing/ com fakes)
  infrastructure/    # adaptadores: persistence/dexie, ocr, imaging, pdf, calendar, notifications, files
  presentation/      # components/, pages/, hooks/, forms/, i18n/
  shared/ptBR/       # rótulos e formatação em português
  composition-root.ts
  App.tsx, main.tsx, index.css
```

## Quando revisar esta decisão

Se o projeto ganhar um backend (ex.: sincronização entre dispositivos), este
documento deve ser atualizado e um novo ADR deve registrar a mudança — não
edite este arquivo retroativamente sem um ADR correspondente.
