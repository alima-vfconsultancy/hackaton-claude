# ADR-0004: Pastas explícitas por camada, portas e modelo de dados normalizado

## Status

Aceito. Complementa o [ADR-0001](./0001-layered-architecture.md): o
mapeamento "provisório" de pastas descrito lá (`domain` ≈ `src/types.ts`,
`application` ≈ `src/lib/`...) é substituído pelo layout abaixo.

## Contexto

O ADR-0001 escolheu a arquitetura em camadas, mas manteve as pastas `lib/` e
`db/` "para não migrar de uma vez". Na prática isso deixou a regra de
dependência só no papel: `lib/` misturava domínio, casos de uso e adaptadores;
`db/repo.ts` e `lib/maintenance.ts` importavam um ao outro; oito páginas,
componentes e hooks importavam Dexie diretamente; textos em português viviam
dentro de regras de negócio; e o modelo de dados tinha campos redundantes
(`intervalHours`, `firstDoseTime` e `times` sempre juntos; `endDate`,
`durationDays` e `continuous` descrevendo a mesma coisa) e valores de enum em
português (`'cápsula'`, `'grande'`, `'alta'`).

## Decisão

1. **Uma pasta por camada**: `src/domain`, `src/application`,
   `src/infrastructure`, `src/presentation`, mais `src/shared/ptBR` e
   `src/composition-root.ts` (ver [`docs/architecture.md`](../architecture.md)).
2. **Portas e adaptadores**: a camada `application` declara interfaces
   (`application/ports.ts`); `infrastructure` as implementa; só o
   `composition-root.ts` conhece os dois lados. A UI usa o objeto `app`.
3. **`shared/ptBR`**: núcleo de textos e formatação em português que pode ser
   importado por qualquer camada exceto `domain`. Evita duplicar rótulos entre
   UI, PDF, `.ics` e notificações sem fazer a infraestrutura depender da
   presentation. Não contém lógica de negócio.
4. **Domínio e aplicação não carregam texto de UI**: validação e erros de
   backup são *códigos*; a presentation os traduz (`presentation/i18n`).
5. **Modelo de dados normalizado**, com valores de enum em inglês:
   - `schedule` é uma união discriminada (`interval` | `fixedTimes`);
   - `period` é `{ startDate, endDate? }` (sem `endDate` = uso contínuo);
     `durationDays` passa a existir só no formulário;
   - `dosage` é `{ amount: number, unit, perMl? } | null`;
   - tipos `LocalDate`, `LocalTime` e `EpochMs` documentam o formato dos
     campos de data/hora;
   - `Med*` vira `Medication*`; `trackFrom` vira `dosesTrackedFrom`;
     `ocrRawText` vira `sourceOcrText`; `PhotoRecord` vira `PrescriptionPhoto`.
6. **Esquema do IndexedDB v2 sem migração**: o app ainda não foi lançado.
   O upgrade do Dexie de v1 (protótipo) para v2 descarta os dados antigos e o
   formato de backup passa para `version: 2` (backups v1 são recusados com
   mensagem clara).
7. **Regra verificada por teste**: `src/architecture.test.ts` falha quando uma
   camada importa outra proibida, quando uma biblioteca de adaptador aparece
   fora da `infrastructure`, ou quando `domain`/`shared`/`application` usam
   globais de navegador.

## Consequências

- A regra de dependência deixa de depender de disciplina: o CI a executa.
- Casos de uso e a persistência são testáveis em Node (fakes em memória e
  `fake-indexeddb`, esta última como devDependency só de testes).
- Trocar uma biblioteca (ex.: outro gerador de PDF) toca uma pasta e o
  composition root.
- Custo: mais arquivos e uma camada de indireção (portas); aceitável para um
  projeto mantido por vários desenvolvedores em paralelo.
- Dados e backups gerados pelo protótipo (v1) não são lidos pela v2.
- As rotas (`/fotografar`, `/historico`...) continuam em português por serem
  parte da URL visível ao usuário (valor, não identificador de código).
