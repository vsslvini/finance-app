# Módulo 4b: visual B e edição pelo app

Escrito em 2026-10-10. Aplica o guia `docs/design.md` na tela Início e deixa editar pelo app o
início do mês (RF30) e o limite da fatura (RF31), com o aviso na tela. **Antes, estude**
[`tela-inicio.md`](tela-inicio.md) (a tela no 3b-1), [`regras-do-mes.md`](regras-do-mes.md)
(as rotas de configurações) e [`../jest.md`](../jest.md), seções 15 a 17.

- [Módulo 4b: visual B e edição pelo app](#módulo-4b-visual-b-e-edição-pelo-app)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. Conceitos novos](#2-conceitos-novos)
  - [3. O caminho de uma edição](#3-o-caminho-de-uma-edição)
  - [4. Arquivo por arquivo](#4-arquivo-por-arquivo)
  - [5. Os testes, um por um](#5-os-testes-um-por-um)
  - [6. Testar à mão](#6-testar-à-mão)
  - [7. Limites e próximos passos](#7-limites-e-próximos-passos)

## 1. O que o módulo entrega

- Tela Início no visual B: fundo escuro, fonte Manrope, mês em maiúsculas, "Posso gastar por
  dia" grande (centavos menores), régua de dias com "dia 12 de 31", cartões "Saldo",
  "Fatura aberta", "Entrou" e "Saiu", e os gastos com ícone redondo da categoria.
- Tocar em **Saldo** abre a folha "Início do mês"; tocar em **Fatura aberta** abre "Limite da
  fatura". Salvar manda um `PATCH /api/configuracoes/` e recarrega o resumo.
- Aviso "A fatura passou do limite de R$ 1.000,00." quando o backend diz que passou.
- Backend: o resumo traz `mes`, `dia_do_mes` e `dias_no_mes`; o `PATCH` recusa limite
  negativo.
- Testes: backend 96 (6 novos); mobile 39 (eram 18).
- Dependências novas (aprovadas): `expo-font` e `@expo-google-fonts/manrope`.

## 2. Conceitos novos

### Tema: as cores num lugar só

`mobile/src/tema.ts` copia o `docs/design.md` para o código, com os mesmos nomes: `cores`,
`coresDeCategoria`, `fontes`, `textos`, `espaco` e `cantos`. As telas nunca escrevem
`#45D699`; escrevem `cores.acento`. Mudar a cor do app é mudar uma linha.

### Fonte própria com `useFonts`

Fonte: https://docs.expo.dev/develop/user-interface/fonts/ (conferido em 2026-10-10).

```tsx
const [carregadas, erro] = useFonts({ Manrope_400Regular, /* ... */ Manrope_800ExtraBold });
if (!carregadas && !erro) return null;
```

- O `_layout.tsx` carrega os 5 pesos quando o app abre; enquanto isso, não desenha nada (uma
  fração de segundo). Funciona no Expo Go.
- Cada peso é uma família própria: negrito é `fontFamily: 'Manrope_700Bold'`, e não
  `fontWeight: 'bold'`.
- A outra forma da documentação (o plugin no `app.json`, que embute a fonte no app) exige um
  app de desenvolvimento próprio; não usamos. O `npx expo install` acrescentou o plugin
  `expo-font` no `app.json` mesmo assim, e ele não atrapalha.

### `Pressable` e `Modal`

- `Pressable` é uma área que responde ao toque. Os cartões Saldo e Fatura aberta são
  `Pressable` com `accessibilityRole="button"` e uma dica (`accessibilityHint`) para o leitor
  de tela.
- `Modal` (do React Native) desenha algo por cima da tela. Com `transparent` e
  `animationType="slide"`, a folha sobe de baixo e o fundo escurecido aparece atrás. O
  `onRequestClose` é chamado pelo botão "voltar" do Android (e é obrigatório lá).

### Estado que decide o que aparece

A tela guarda `campoAberto` (`null`, `'inicioDoMes'` ou `'limiteDaFatura'`). Tocar num cartão
muda esse estado; o React desenha de novo; a folha aparece só quando ele não é `null`. Fechar é
voltar para `null`. É o mesmo padrão do `estado` de carregando/erro/sucesso do 3b-1.

### Ler o que a pessoa digitou: `lerReais`

`lerReais("1.000,50")` devolve `"1000.50"`, o formato da API. Vazio vira `null` (sem limite).
Texto que não é dinheiro lança erro, e a folha mostra "Digite um valor, ex.: 1.000,00." sem
chamar o servidor. Como o `formatarNumero`, trabalha com texto, sem `Number`, para não perder
centavos.

### Ícone da categoria

`iconeDaCategoria("Food delivery")` devolve a sigla "RE" e as cores. A ligação usa os nomes
oficiais da árvore de categorias da Pluggy (guia `products/transaction-categorization`,
conferido em 2026-10-10): Mercado (`Groceries`), Restaurantes (`Food and drinks`, `Eating
out`, `Food delivery`), Transporte (`Transportation` e as subcategorias dele). O resto vira
"OU".

### O 400 só é "valor recusado" ao salvar

`api.ts` tem um ajudante único (`pedirApi`) para os três pedidos. Um 400 num `PATCH` vira
`ErroApi('validacao', mensagem do backend)`, e a mensagem aparece embaixo do campo. Um 400 num
`GET` (por exemplo, o IP fora do `DJANGO_ALLOWED_HOSTS`) continua sendo erro do servidor.

## 3. O caminho de uma edição

```
Toque em "Saldo" ─► setCampoAberto('inicioDoMes') ─► FolhaDeEdicao aparece
   └─ useEffect da folha ─► buscarConfiguracoes() ─► GET /api/configuracoes/
         └─ campo preenchido com "3" (o valor salvo)
Digita "2" ─► toca "Salvar"
   ├─ não é número? ─► "Digite um número de 0 a 10." (sem chamar o servidor)
   └─ salvarConfiguracoes({ dias_antes_do_mes: 2 }) ─► PATCH /api/configuracoes/
         ├─ 400 ─► mensagem do backend embaixo do campo; folha continua aberta
         └─ 200 ─► aoSalvar(): fecha a folha e recarrega
                     └─ buscarResumo() ─► GET /api/resumo/ ─► números do mês novo
```

## 4. Arquivo por arquivo

### Backend

- `financas/services/resumo.py` e `serializers.py`: os campos `mes` ("AAAA-MM", sempre),
  `dia_do_mes` e `dias_no_mes` (só no mês atual do app; senão `null`).
- `planejamento/serializers.py`: `validate_limite_fatura` recusa negativo com "O limite da
  fatura não pode ser negativo." (`null` e zero passam). Sem mudança no model, então sem
  migration. O admin ainda aceita negativo.

### Mobile

| Arquivo | Para que serve |
|---|---|
| `src/tema.ts` (novo) | os tokens do `docs/design.md` |
| `src/categorias.ts` (novo) | `iconeDaCategoria` |
| `src/mensagens.ts` (novo) | `MENSAGENS_DE_ERRO`, usado pela tela e pela folha |
| `src/componentes/Botao.tsx` (novo) | botões principal e secundário do guia |
| `src/componentes/ReguaDeDias.tsx` (novo) | os traços do mês (escondidos do leitor de tela) e o "dia X de Y" |
| `src/componentes/FolhaDeEdicao.tsx` (novo) | a folha: carrega, valida, salva e mostra erros |
| `src/formatacao.ts` | ganhou `lerReais` |
| `src/api.ts` | campos novos do `Resumo`, `buscarConfiguracoes`, `salvarConfiguracoes`, tipo `validacao` |
| `src/app/_layout.tsx` | carrega a fonte, barra do celular clara, fundo escuro |
| `src/app/index.tsx` | a tela no visual B, com o título vindo de `resumo.mes` |

O título agora vem do backend (`resumo.mes`), e não do relógio do celular: com o mês começando
2 dias antes, no dia 30/10 o app já está em novembro.

## 5. Os testes, um por um

Rodar: `cd mobile && npx jest --verbose`; backend: `cd backend && pytest -v`.

### Backend (6 novos)

- `test_mes_atual_traz_o_mes_o_dia_e_o_total_de_dias`: 2 dias antes, hoje 10/10: "2026-10",
  dia 12 de 31.
- `test_outro_mes_tem_o_mes_mas_nao_o_dia`: setembro vista em outubro: `mes` preenchido, dia
  e total `None`.
- `test_resumo_traz_o_mes_o_dia_e_o_total_de_dias` (API): o mesmo pelo caminho inteiro, com o
  `null` no JSON. Usa `fixar_hoje`, a forma nova de `monkeypatch` explicada em
  [`../pytest.md`](../pytest.md), seção 4.
- `test_resumo_sem_mes_no_dia_30_ja_e_novembro` (API): em 30/10 o app está em novembro (dia 1
  de 30).
- `test_patch_recusa_limite_negativo`: "-10.00" recebe 400 e o banco não muda.
- `test_patch_aceita_limite_zero`: "0.00" passa (protege contra trocar `< 0` por `<= 0`).

### Mobile: formatação e categorias

- **lerReais:** "1000" vira "1000.00"; "1.000,50" vira "1000.50"; "0,5" vira "0.50"; vazio
  vira `null`; "abc" lança erro (o `expect` recebe `() => lerReais('abc')`, para o erro
  acontecer dentro do Jest).
- **iconeDaCategoria:** Groceries é ME; Food delivery é RE; Gas stations é TR; "Sem categoria"
  e uma inventada são OU.

### Mobile: tela

- **Rótulos e régua (caso 5):** "Posso gastar por dia", "Saldo", "Fatura aberta", "Entrou",
  "Saiu" e "dia 12 de 31".
- **Título:** usa `mes: '2026-03'` e espera "Março de 2026". Março de propósito: um mês
  diferente do atual prova que o título vem do resumo.
- **Aviso (caso 6, dois testes):** aparece com `fatura_acima_do_limite`; não aparece sem. O
  segundo espera a tela carregar antes, senão a ausência não provaria nada.
- **Negativo (caso 7):** "- R$ 10,00" aparece e o aviso antigo não.
- **Gastos:** siglas "ME" e "TR" (procuradas com `includeHiddenElements`, porque o ícone é
  escondido do leitor de tela), valores e detalhes, na ordem.
- **Leitor de tela:** "Saiu no mês: 1.830,45 reais".
- **Cartões tocáveis (caso 12):** acha Saldo e Fatura aberta como botões, pelo nome, e confere
  a dica com `toHaveProp`.

### Mobile: folhas (com o servidor falso da seção 15 do `jest.md`)

As configurações falsas vêm com 3 dias antes (e não 0), para provar que o valor mostrado veio
do servidor.

- **Abrir (caso 8):** tocar em Saldo mostra "Início do mês" e o campo com "3".
- **Salvar (caso 8):** digitar "2" e salvar manda um `PATCH` com token, `Content-Type` e o corpo
  `{"dias_antes_do_mes": 2}`.
- **Recarregar (caso 8):** depois de salvar, o resumo foi pedido de novo e a folha sumiu.
- **Cancelar (caso 10):** fecha sem nenhum `PATCH`.
- **Limite (caso 9, dois testes):** "1.000,00" manda `"1000.00"`; campo vazio manda `null`.
- **Recusa (caso 11):** o `PATCH` responde 400 com a mensagem do backend; ela aparece e a folha
  continua aberta.

### Rotas

O teste do Router troca o pacote da fonte por um dublê já carregado (`jest.mock`, seção 16
do `jest.md`), senão o layout não desenharia nada.

## 6. Testar à mão

1. Reinicie o backend (`python manage.py runserver 0.0.0.0:8000`); não precisa de `migrate`.
2. `cd mobile && npx expo start --clear` e abra no Expo Go.
3. Confira: tela escura com a fonte nova, mês em maiúsculas, número grande, régua e ícones.
4. Toque em **Saldo**, coloque 2 e salve: as entradas devem passar a incluir o salário do fim
   do mês anterior, e a régua muda.
5. Toque em **Fatura aberta**, coloque um limite menor que a fatura e salve: aparece o aviso.
   Apague o campo e salve: o aviso some.
6. Tente um limite "-10": o app recusa antes ("Digite um valor..."), porque "-" não é aceito
   pelo `lerReais`; o backend também recusaria.

## 7. Limites e próximos passos

- O `Modal` com `slide` não respeita o "reduzir movimento" do celular (o guia pede); ficaria
  para um ajuste com `AccessibilityInfo`.
- A folha some sem animação de descida (ela é desmontada ao fechar), o que é mais simples e
  sempre começa do zero.
- A linha "atualizado às..." da régua e o puxar para baixo ficam para o 3b-2.
- O admin do Django ainda aceita limite negativo.
- Casos sugeridos pelo `mobile-tester`, fora da lista aprovada: as mensagens locais da folha
  sem `PATCH`, a régua ausente com `null`, `salvarConfiguracoes` testada direto e mais
  entradas do `lerReais`.
- **Módulo 5:** plano de guardar, com os investimentos como "já guardado".
