# MeuRemédio — guia do projeto

PWA mobile-first, em português do Brasil, para organizar medicamentos: fotografar a
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
npm run dev        # servidor de desenvolvimento (botão "Carregar exemplo" aparece em Configurações)
npm run build      # typecheck (tsc -b) + build de produção em dist/
npm run preview    # serve o build (use para testar PWA/offline)
npm test           # Vitest (uma execução)
npm run icons      # regenera os ícones PNG do PWA (scripts/generate-icons.mjs)
```

## Estrutura de pastas
```
src/
  main.tsx, App.tsx, index.css
  types.ts                 # Medication, DoseLog, Settings e enums
  db/db.ts                 # Dexie: tabelas medications, doseLogs, settings, photos
  db/repo.ts               # operações de alto nível (salvar, pausar, encerrar, excluir, marcar dose)
  lib/                     # LÓGICA PURA E TESTÁVEL (sem React)
    schedule.ts            # geração de horários / doses / prévia em texto
    prescriptionParser.ts  # texto do OCR -> sugestões com confiança alta/baixa
    maintenance.ts         # materializa doses, marca "missed", encerra tratamentos vencidos
    ocr.ts                 # wrapper do Tesseract.js
    imagePreprocess.ts     # canvas: redimensiona, cinza, contraste; miniatura
    ics.ts                 # gera arquivo .ics (RRULE + VALARM)
    pdf.ts                 # gera PDF A4 (jsPDF + autotable)
    backup.ts              # exportar/importar JSON + validação
    notifications.ts       # permissão e disparo via service worker
    format.ts              # formatação pt-BR (datas, frequência, dose)
    sampleData.ts          # dados de exemplo (modo dev)
  components/              # UI reutilizável (DoseCard, MedicationForm, BottomNav...)
  pages/                   # uma por tela
  hooks/                   # useSettings, useReminders...
public/
  icons/                   # ícones do PWA
  tesseract/               # worker + core wasm do Tesseract (copiados no postinstall, git-ignored)
  sw-notifications.js      # handler de notificationclick importado pelo SW
scripts/                   # utilitários de build (ícones, cópia do Tesseract)
```
Testes ficam ao lado do código: `src/lib/*.test.ts`.

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
5. Exclusões e "Apagar todos os dados" exigem confirmação (dupla no caso de apagar tudo).

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

- [`docs/arquitetura.md`](./docs/arquitetura.md) — camadas (domain/application/
  infrastructure/presentation) e regra de dependência entre pastas.
- [`docs/processo-de-desenvolvimento.md`](./docs/processo-de-desenvolvimento.md) —
  papéis (coordenador/executor/revisor independente), TDD obrigatório, gate
  de aprovação humana antes de qualquer código.
- [`docs/padroes-de-codigo.md`](./docs/padroes-de-codigo.md) — nomenclatura e
  **idioma: código sempre em inglês, interface sempre em português**.
- [`docs/templates/plano-de-entrega.md`](./docs/templates/plano-de-entrega.md) —
  template obrigatório antes de iniciar qualquer tarefa.
- [`docs/adr/`](./docs/adr/) — decisões arquiteturais registradas.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branches, Conventional Commits,
  Pull Requests, versionamento/release automático.

Regras que nenhum agente pode contornar: nunca fazer merge/push direto em
`main`; nunca colar trechos de conversa do chat na descrição de commits/PRs;
sempre abrir PR a partir de uma branch atualizada com `main` e sem conflitos.

## Decisões técnicas registradas
- **Datas**: `startDate`/`endDate` são strings `yyyy-MM-dd` (data local); `scheduledAt`, `takenAt`,
  `createdAt`, `updatedAt` são timestamps em ms. Horários são `HH:mm` em hora local.
- **Duração**: ao salvar com `durationDays`, o app calcula `endDate = startDate + durationDays - 1`.
  `endDate` é inclusivo (doses até 23:59 desse dia).
- **Doses materializadas**: `maintenance.syncDoses()` cria registros `DoseLog` (status `pending`) do
  início do acompanhamento até o fim do dia atual. Índice único `[medicationId+scheduledAt]` evita duplicatas.
- **`trackFrom`** (campo interno em Medication): momento a partir do qual geramos doses. No cadastro
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
- **Tesseract offline**: worker e core (wasm) servidos da própria origem (`public/tesseract`, precacheados);
  dados do idioma baixados do jsDelivr na primeira leitura e cacheados (Workbox CacheFirst + IndexedDB do Tesseract).
- **Fotos**: tabela `photos` separada; `Medication.photoId` aponta para a miniatura (uma receita pode ter vários remédios).
- **Configurações** ficam no Dexie (tabela `settings`, chave `app`). `localStorage` não é usado.
- **Dados de exemplo**: botão "Carregar exemplo" em Configurações quando `import.meta.env.DEV`
  ou `VITE_DEMO=true`.
- Ícones via `lucide-react` (simples e tree-shakeable).
- **Navegação inferior**: o 4º item se chama "Ajustes" (rota `/configuracoes`) porque "Configurações" não cabe em 360px.
- **Rotas**: `/`, `/fotografar`, `/revisar`, `/medicamento/novo`, `/medicamento/:id/editar`, `/historico`, `/historico/:id`, `/exportar`, `/configuracoes`.
- **Code splitting**: jsPDF e Tesseract são carregados sob demanda (`import()`).
- **Versões**: Vite 6, Tailwind 3, React Router 6, TypeScript 5.9 (majors estáveis) em vez dos mais novos.
