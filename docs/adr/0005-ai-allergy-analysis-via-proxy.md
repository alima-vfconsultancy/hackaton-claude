# ADR-0005: Análise de alergias por IA através de um proxy

## Status

Proposto. Aguarda aprovação humana, porque abre uma exceção à regra de
segurança nº 3 do `CLAUDE.md` ("nenhum dado é enviado a servidores").

## Contexto

A verificação local de alergias (`domain/allergy.ts` + tabela
`domain/activeIngredients.ts`) só reconhece as marcas e classes cadastradas
na tabela. Para cobrir qualquer marca, é preciso um modelo de linguagem. O
app é client-only: uma chave de API no navegador ficaria exposta a qualquer
pessoa. O token do Claude Code é credencial pessoal e não serve para um app
distribuído; a API exige uma chave da API da Anthropic.

## Decisão

1. A análise por IA é **opcional e acionada pelo usuário** (botão "Verificar
   agora" na tela de revisão), depois de um **consentimento explícito** guardado
   em `Settings.allergyAiConsent` (padrão `false`, revogável em Ajustes).
2. O app envia **somente** os nomes dos remédios e as substâncias das alergias.
   Nunca foto, texto do OCR, doses, horários ou dados pessoais.
3. O navegador chama um **proxy serverless** (`api/analyze-allergy.ts`, Vercel)
   que guarda `ANTHROPIC_API_KEY` e chama o Claude (`claude-opus-5-5`, saída
   estruturada em JSON). O proxy valida o tamanho da entrada, só aceita as
   origens de `ALLOWED_ORIGINS` (CORS) e esconde erros do provedor.
4. Na aplicação, a porta `AllergyAnalyzer` é opcional (`null` sem
   `VITE_ALLERGY_API_URL`). Falha de rede nunca bloqueia o fluxo; a
   verificação local continua valendo.
5. O resultado é **sugestão**: não bloqueia o salvamento nem cria alertas, e o
   `Disclaimer` continua visível na revisão.

## Consequências

- A regra 3 do `CLAUDE.md` passa a ter uma exceção documentada (a única
  requisição com dados do usuário), condicionada ao consentimento. Alterar o
  texto da regra depende do aprovador humano.
- Há custo por chamada e uma função pública que gasta a chave: o CORS não
  impede chamadas fora de um navegador. Antes de publicar, adicionar limite de
  requisições (por exemplo, Vercel WAF ou Upstash Ratelimit) e um teto de
  gasto na conta da Anthropic.
- O modelo pode errar (falso negativo inclusive). Por isso a mensagem ao
  usuário sempre manda confirmar com médico ou farmacêutico.
- Sem rede, o recurso não funciona (o PWA segue offline para todo o resto).
