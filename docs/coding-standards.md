# Padrões de código

## Idioma: código em inglês, interface em português

- Todo identificador de código — nomes de arquivo, pasta, classe, função,
  variável, tipo, propriedade, comentário, mensagem de commit, nome de
  branch, título de PR/issue — **em inglês**.
- Todo texto exibido ao usuário final (labels, botões, mensagens de erro,
  conteúdo do PDF, texto do `.ics`) — **em português do Brasil**, como já
  descrito em `CLAUDE.md`.
- Nunca misture: não crie uma variável `medicamento`, nem uma string de UI em
  inglês. Se uma string em português precisar aparecer dentro de um arquivo
  `.ts`/`.tsx`, ela é um valor (conteúdo), não um identificador — tudo bem.

```ts
// ✅ correto
export function buildDoseSummary(medication: Medication): string {
  // "times" already sorted ascending by schedule.ts
  return `Você tomará às ${medication.times.join(', ')}`;
}

// ❌ errado — identificador em português
export function montarResumoDose(remedio: Medication): string { /* ... */ }
```

## Nomenclatura de arquivos

- Componentes React: `PascalCase.tsx` (ex.: `DoseCard.tsx`).
- Páginas: `PascalCase.tsx` terminando em `Page` (ex.: `TodayPage.tsx`).
- Módulos de lógica pura / adaptadores: `camelCase.ts` (ex.: `schedule.ts`,
  `prescriptionParser.ts`).
- Testes: ao lado do arquivo testado, mesmo nome + `.test.ts`/`.test.tsx`
  (ex.: `schedule.test.ts`).
- Hooks: `useCamelCase.ts` (ex.: `useReminders.ts`).

## Nomenclatura de código

- Variáveis e funções: `camelCase`.
- Tipos, interfaces, enums, componentes: `PascalCase`.
- Constantes verdadeiramente imutáveis/globais: `UPPER_SNAKE_CASE`.
- Sem abreviações obscuras (`med` ❌, `medication` ✅). Abreviações amplamente
  conhecidas no domínio (`ocr`, `pdf`, `ics`) são aceitas.
- Booleans com prefixo de pergunta: `isActive`, `hasPhoto`, `shouldNotify`.

## Comentários e docstrings (TSDoc)

Toda função **exportada** de `src/lib/` e `src/db/` (camadas application e
infrastructure) deve ter um comentário TSDoc explicando o contrato — não a
implementação:

```ts
/**
 * Gera os horários de dose a partir da configuração de agenda do
 * medicamento. Cobre intervalos que atravessam a meia-noite.
 *
 * @param medication - medicamento com `scheduleType` definido
 * @param referenceDate - dia de referência (hora local)
 * @returns horários ordenados em formato `HH:mm`
 */
export function buildScheduleTimes(
  medication: Medication,
  referenceDate: Date,
): string[] { /* ... */ }
```

Componentes React e páginas não precisam de TSDoc extenso — um comentário de
uma linha descrevendo a responsabilidade da tela/componente basta.

Comentários explicam **por quê**, não **o quê** (o código já diz o quê).
Evite comentários redundantes como `// soma a e b` acima de `return a + b`.

## Commits (Conventional Commits)

Ver `CONTRIBUTING.md` para o padrão completo de commits, branches e PRs.

## Testes

- Vitest, um arquivo de teste por módulo de `src/lib/`.
- Nome do teste descreve o comportamento, não a implementação (ver skill
  `test-driven-development`).
- Nenhuma função nova em `src/lib/` é aceita sem teste correspondente.
