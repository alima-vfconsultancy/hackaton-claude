# MeuRemédio — guia do projeto

PWA mobile-first para organizar medicamentos: fotografar a
receita → OCR local → revisão pelo usuário → agenda de doses com lembretes →
histórico → PDF. Público: adultos e idosos. Simplicidade e legibilidade vêm antes
de qualquer recurso extra.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS 3 (mobile-first, 360–430px)
- React Router 6
- Dexie.js (IndexedDB) + dexie-react-hooks — **nada de backend; nada de localStorage para dados principais**
- Tesseract.js (idioma `por`) rodando no navegador
- jsPDF + jspdf-autotable
- date-fns (locale `ptBR`)
- vite-plugin-pwa (manifest + service worker Workbox)
- Vitest (testes unitários)
- lucide-react (ícones)

## Comandos
```
npm install        # instala dependências (copia os arquivos do Tesseract para public/tesseract via postinstall)
npm run dev        # servidor de desenvolvimento
npm run build      # typecheck (tsc -b) + build de produção em dist/
npm run preview    # serve o build (use para testar PWA/offline)
npm test           # Vitest (uma execução)
npm run icons      # regenera os ícones PNG do PWA (scripts/generate-icons.mjs)
```

## Estrutura de pastas
Quatro camadas explícitas + um núcleo de textos pt-BR (ver `docs/architecture.md` e ADR-0004):
```
src/
  domain/                  # regras puras, sem libs de UI/IO: tipos, agenda, doses, adesão, validação
    time.ts                # LocalDate (yyyy-MM-dd), LocalTime (HH:mm), EpochMs e helpers
    medication.ts          # Medication, MedicationDraft, Schedule, TreatmentPeriod, Dosage, validação por códigos
    schedule.ts            # geração de horários / doses / prévia dos horários
    dose.ts                # DoseLog, DoseStatus, regra de dose perdida
    adherence.ts           # taxa de adesão e filtros de período/status
    settings.ts, photo.ts
  application/             # casos de uso + portas (interfaces); só conhece domain e shared
    ports.ts               # repositórios, OcrEngine, PdfReportGenerator, ReminderNotifier...
    createApplication.ts   # monta os serviços a partir das portas
    medicationService.ts, doseService.ts, reminderService.ts, settingsService.ts
    reportService.ts, backup.ts, sampleData.ts, syncDoses.ts
    prescriptionParser.ts  # texto do OCR -> sugestões com confiança high/low
    testing/               # fakes em memória usados nos testes
  infrastructure/          # adaptadores das portas (único lugar com Dexie/Tesseract/jsPDF/Web APIs)
    persistence/dexie/     # schema, repositórios e transações (IndexedDB)
    ocr/, imaging/, pdf/, calendar/, notifications/, files/
  presentation/            # React: components/, pages/, hooks/, forms/, i18n/
  shared/ptBR/             # textos e formatação pt-BR (rótulos, datas, frequência); usado por todas as camadas
  composition-root.ts      # único ponto que liga adaptadores às portas (exporta `app`)
  main.tsx, App.tsx, index.css
public/
  icons/                   # ícones do PWA
  tesseract/               # worker + core wasm do Tesseract (copiados no postinstall, git-ignored)
  sw-notifications.js      # handler de notificationclick importado pelo SW
scripts/                   # utilitários de build (ícones, cópia do Tesseract)
```
Testes ficam ao lado do código (`*.test.ts`). `src/architecture.test.ts` verifica a regra de dependência
entre camadas e falha se alguém importar Dexie/Tesseract/jsPDF fora de `infrastructure`.

## Regras de segurança (inegociáveis)
1. **O OCR nunca cria medicamentos nem alertas diretamente.** Todo resultado passa pela
   tela de revisão editável e só é salvo depois que o usuário toca em
   "Confirmar e criar lembretes". `prescriptionParser` só devolve *sugestões*.
2. O aviso abaixo fica visível (componente `Disclaimer`) na tela Hoje, na revisão, no
   formulário e no rodapé do PDF:
   > Este app é um organizador e não substitui a orientação do seu médico ou farmacêutico. Confira sempre os dados com a receita.
3. Todos os dados ficam no aparelho (IndexedDB). Nenhum dado é enviado a servidores.
   A única requisição externa é o download dos dados do idioma português do Tesseract
   (cacheados pelo service worker e pelo próprio Tesseract).
4. A foto da receita **não** é guardada, a menos que o usuário marque
   "Guardar foto da receita" (salva como miniatura JPEG comprimida).
5. Exclusões exigem confirmação. Se "Apagar todos os dados" voltar para a tela, exige confirmação dupla
   (hoje a opção não aparece na interface; ver "Tela Ajustes da POC").

## Acessibilidade / design
- Fonte base 16px (18px no modo grande: `html.font-large`), tudo em `rem`.
- Alvos de toque ≥ 48px (`min-h-12`), contraste WCAG AA, `label` em todo campo, foco visível (`focus-visible:ring`).
- Status sempre com cor **e** ícone **e** texto.
- Linguagem simples; mensagens de erro dizem o que fazer. Sem animações desnecessárias.
- Navegação inferior com 4 itens: Hoje, Histórico, Exportar, Configurações.

## Processo, arquitetura e governança

Este projeto é construído por 5 desenvolvedores que usam exclusivamente
agentes de IA. O processo completo (plano aprovado → TDD → revisor
independente → PR → merge humano → release automático) está documentado
separadamente e é tão vinculante quanto este arquivo:

- [`docs/architecture.md`](./docs/architecture.md) — camadas (domain/application/
  infrastructure/presentation) e regra de dependência entre pastas.
- [`docs/development-process.md`](./docs/development-process.md) —
  papéis (coordenador/executor/revisor independente), TDD obrigatório, gate
  de aprovação humana antes de qualquer código.
- [`docs/coding-standards.md`](./docs/coding-standards.md) — nomenclatura e
  **idioma: código sempre em inglês, interface sempre em português**.
- [`docs/templates/delivery-plan.md`](./docs/templates/delivery-plan.md) —
  template obrigatório antes de iniciar qualquer tarefa.
- [`docs/adr/`](./docs/adr/) — decisões arquiteturais registradas.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branches, Conventional Commits,
  Pull Requests, versionamento/release automático (fonte das regras de
  merge/PR; nenhum agente pode contorná-las).

## Decisões técnicas registradas
- **Modelo de dados normalizado** (inglês, valores de enum em inglês; rótulos pt-BR ficam em `shared/ptBR`):
  `Medication` = `name`, `dosage: {amount:number, unit, perMl?} | null`, `form`
  (`tablet|capsule|liquid|drops|ointment|injection|other`), `schedule` (união discriminada:
  `{type:'interval', intervalHours, firstDoseTime}` ou `{type:'fixedTimes', times}`), `period`
  (`{startDate, endDate?}`; sem `endDate` = uso contínuo), `status`, `prescriber`, `notes`,
  `sourceOcrText?`, `photoId?`, `dosesTrackedFrom`. `Settings.fontScale` é `normal|large`.
- **Datas**: `startDate`/`endDate` são strings `yyyy-MM-dd` (`LocalDate`, data local); `scheduledAt`, `takenAt`,
  `createdAt`, `updatedAt` são timestamps em ms (`EpochMs`). Horários são `HH:mm` (`LocalTime`) em hora local.
- **Hora padrão da 1ª dose**: a partir das 23h o formulário novo sugere 08:00 (antes caía em 00:00 por um bug de comparação).
- **Duração**: `durationDays` existe só no formulário (`presentation/forms`); ao salvar, o app calcula
  `endDate = startDate + durationDays - 1`. `endDate` é inclusivo (doses até 23:59 desse dia).
- **Doses materializadas**: `syncDoses` (application) cria registros `DoseLog` (status `pending`) do
  início do acompanhamento até o fim do dia atual. Índice único `[medicationId+scheduledAt]` evita duplicatas.
- **`dosesTrackedFrom`** (campo interno em Medication): momento a partir do qual geramos doses. No cadastro
  e ao retomar/editar a agenda = agora − 2h. Assim, cadastrar um remédio iniciado há uma semana não
  gera dezenas de doses "perdidas" falsas.
- **Editar agenda**: apaga as doses `pending`/`snoozed` do medicamento e gera de novo; doses
  tomadas/puladas/perdidas ficam no histórico.
- **Adiar**: status `snoozed` + campo `snoozedUntil` (agora + `snoozeMinutes`). A regra de "perdida"
  usa `snoozedUntil ?? scheduledAt` + 2h.
- **Notificações**: `notifiedAt` no DoseLog evita repetir o alerta. Verificação a cada 30s enquanto o
  app está aberto; `registration.showNotification` com vibração. Clique na notificação abre/foca o app.
- **Lembretes garantidos**: arquivo `.ics` com horário "flutuante" (sem fuso; usa o do celular).
  Intervalos que dividem 24h viram eventos diários (um por horário); os demais usam `FREQ=HOURLY`.
- **"Nx ao dia"** no parser vira horários fixos sugeridos (1x 08:00; 2x 08:00/20:00; 3x 08:00/14:00/20:00;
  4x 08:00/12:00/16:00/20:00) marcados como confiança baixa para conferência.
- **Dosagem**: o parser prefere a concentração (500 mg); sem ela, usa a quantidade por tomada (20 gotas).
  Concentrações como `250mg/5ml` viram `{amount:250, unit:'mg', perMl:5}`.
- **Esquema do IndexedDB**: o Dexie está na versão 2 (registros normalizados). A versão 1 era do protótipo
  e seus dados são descartados no upgrade; backups `.json` antigos (`version: 1`) não são aceitos.
- **Textos de erro**: domínio e aplicação devolvem *códigos* (`MedicationIssueCode`, `BackupError.code`);
  as mensagens em português ficam em `presentation/i18n/messages.ts`.
- **Tesseract offline**: worker e core (wasm) servidos da própria origem (`public/tesseract`, precacheados);
  dados do idioma baixados do jsDelivr na primeira leitura e cacheados (Workbox CacheFirst + IndexedDB do Tesseract).
- **Pipeline do OCR**: `infrastructure/imaging/filters` (funções puras) faz escala para ~2400 px (amplia até 2x
  imagens pequenas), mediana 3×3, correção de iluminação (divide pelo fundo estimado), contraste, deskew por perfil
  de projeção e gera 2 variantes: cinza realçada e binarizada (Sauvola). O `tesseractOcrEngine` lê as variantes com
  um único worker (`user_defined_dpi=300`), pula a 2ª se a 1ª tiver confiança ≥ 85 e funde as linhas pela sobreposição
  das caixas, ficando com a mais confiável (`mergeOcrLines`). `application/ocrTextCleanup` corrige `5OO`→`500`,
  `rng`→`mg`, `cornprimido`→`comprimido` antes do parser (nunca mexe no nome do remédio).
- **Fotos**: tabela `photos` separada; `Medication.photoId` aponta para a miniatura (uma receita pode ter vários remédios).
- **Configurações** ficam no Dexie (tabela `settings`, linha de chave `app`, detalhe só do adaptador). `localStorage` não é usado.
- **Tela Ajustes da POC**: só Notificações, Tamanho da letra e Instalar na tela inicial. Backup (exportar/importar
  JSON), Demonstração ("Carregar exemplo") e "Apagar todos os dados" foram tirados da tela; por ser POC, o usuário
  não tem como salvar ou recuperar os dados. Os serviços `app.backup` (inclui `wipeAll`) e `app.sampleData`, o
  `SAMPLE_DATA_ENABLED` (`composition-root.ts`) e as mensagens de `BackupError` continuam no código, sem uso na
  interface. `SettingsPage.test.ts` garante que as opções não voltem por engano.
- Ícones via `lucide-react` (simples e tree-shakeable).
- **Navegação inferior**: o 4º item se chama "Ajustes" (rota `/configuracoes`) porque "Configurações" não cabe em 360px.
- **Rotas** (URLs voltadas ao usuário, por isso em português): `/`, `/fotografar`, `/revisar`, `/medicamento/novo`, `/medicamento/:id/editar`, `/historico`, `/historico/:id`, `/exportar`, `/configuracoes`.
- **Code splitting**: jsPDF e Tesseract são carregados sob demanda (`import()` dentro dos adaptadores de `infrastructure`).
- **Versões**: majors estáveis — Vite 6, Tailwind 3, React Router 6, TypeScript 5.9.
