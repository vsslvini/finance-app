# Módulo 4c: ajustes do mês

Escrito em 2026-10-10. Três ajustes pedidos depois de usar o app com os dados reais: a regra
de "Entrou" e "Saiu" passa a contar só a conta corrente; a edição do início do mês muda para o
cartão "Entrou"; e a tela ganha o acento roxo e ícones. **Antes, estude**
[`regras-do-mes.md`](regras-do-mes.md) e [`design-e-edicao.md`](design-e-edicao.md).

- [Módulo 4c: ajustes do mês](#módulo-4c-ajustes-do-mês)
  - [1. Por que a regra mudou (o caso real)](#1-por-que-a-regra-mudou-o-caso-real)
  - [2. A regra nova, em português](#2-a-regra-nova-em-português)
  - [3. Conceitos novos](#3-conceitos-novos)
  - [4. Arquivo por arquivo](#4-arquivo-por-arquivo)
  - [5. Os testes, um por um](#5-os-testes-um-por-um)
  - [6. Testar à mão](#6-testar-à-mão)
  - [7. Limites e próximos passos](#7-limites-e-próximos-passos)

## 1. Por que a regra mudou (o caso real)

No mês do app de 29/09 a 29/10/2026, a tela mostrou Saiu (R$ 3.370,98) maior que Entrou
(R$ 2.961,10). Uma consulta nos dados mostrou três motivos:

1. **Fatura contada duas vezes (R$ 510,29).** Dois pagamentos de fatura vieram da Pluggy com a
   categoria genérica `Transfers`, e não `Credit card payment`. A regra antiga só reconhecia o
   pagamento pela categoria, então contou as compras do cartão **e** o pagamento.
2. **Investimento contado como gasto (R$ 300,00).** Uma "Aplicação RDB" (categoria
   `Investments`) é dinheiro guardado.
3. **Dois meses de cartão no mesmo mês.** O salário deste mês pagou a fatura de setembro, e as
   compras deste mês no cartão serão pagas com o salário de novembro.

Sem os motivos 1 e 2, sobraram cerca de R$ 400. Lição: a regra que só confia na categoria
quebra quando a categoria vem errada; contar pelo lugar onde o dinheiro passa (a conta
corrente) não depende dela.

## 2. A regra nova, em português

Decidida em 2026-10-10 (dúvida 7 de `docs/requisitos.md`):

- **Entrou** = valores positivos das **contas correntes** no mês do app, sem transferências
  entre contas suas e sem resgates de investimento.
- **Saiu** = valores negativos das **contas correntes** no mês do app, sem transferências
  entre contas suas e sem aplicações em investimento. **O pagamento da fatura conta**, venha
  com a categoria que vier.
- **Compras no cartão** não entram em Saiu; ficam na "Fatura aberta" e na lista de últimos
  gastos.
- **Investimento** = categorias `Investments`, `Automatic investment`, `Fixed income`,
  `Mutual funds`, `Variable income`, `Margin` e `Pension`. Juros e dividendos
  (`Proceeds interests and dividends`) continuam sendo entrada.

Com a regra nova, o mês real fica: Entrou R$ 2.961,10 e Saiu R$ 2.584,56.

## 3. Conceitos novos

### Combinar condições guardadas com `|`

O `resumo.py` guarda condições em variáveis com `Q` (ver [`resumo-do-mes.md`](resumo-do-mes.md),
seção 3) e agora as combina:

```python
INVESTIMENTO = Q(categoria_pluggy__in=[...])
NAO_CONTA_NO_MES = TRANSFERENCIA_PROPRIA | INVESTIMENTO       # | quer dizer "ou"
NAO_E_GASTO = NAO_CONTA_NO_MES | PAGAMENTO_DE_FATURA          # só para a lista
```

- `__in=[...]` é "a categoria é uma destas".
- `NAO_CONTA_NO_MES` tira das entradas e saídas o dinheiro que só trocou de lugar.
- `NAO_E_GASTO` serve só para a lista de últimos gastos, que também esconde o pagamento da
  fatura.

### Ícones com `@react-native-vector-icons/lucide`

Fontes: [post do Expo sobre o fim do `@expo/vector-icons`](https://expo.dev/blog/moving-away-from-expo-vector-icons)
e o `README.md` do pacote instalado (conferidos em 2026-10-10).

```tsx
import { Lucide } from '@react-native-vector-icons/lucide';

<Lucide name="wallet" size={16} color={cores.textoSecundario} />
```

- O ícone é um texto desenhado com uma fonte especial (cada ícone é um caractere).
- No Expo Go, o pacote carrega essa fonte com o `expo-font` quando o app roda; até carregar, o
  ícone fica vazio por um instante.
- O nome do ícone é conferido pelo TypeScript (tipo `LucideIconName`): um nome errado vira
  erro no `tsc`.
- Os ícones ficam escondidos do leitor de tela, porque o rótulo do cartão já diz tudo.

### `testID`

Para achar o ícone da categoria nos testes, o círculo ganhou
`testID="icone-categoria-shopping-cart"` (ver [`../jest.md`](../jest.md), seção 17).

## 4. Arquivo por arquivo

| Arquivo | O que mudou |
|---|---|
| `backend/financas/services/resumo.py` | constantes `INVESTIMENTO` e `NAO_CONTA_NO_MES`; entradas e saídas só da conta corrente |
| `backend/financas/tests/test_resumo.py` | 3 testes novos e 1 renomeado (seção 5) |
| `mobile/src/tema.ts` | `acento` e `diaHoje` `#A78BFA`, `diaPassado` `#5B4AA8` (roxo) |
| `mobile/src/categorias.ts` | `iconeDaCategoria` devolve `{ icone, fundo, cor }` (sem sigla) |
| `mobile/src/componentes/RotuloDoCartao.tsx` (novo) | ícone + rótulo, usado nos quatro cartões |
| `mobile/src/app/index.tsx` | Entrou vira botão (abre "Início do mês"); Saldo deixa de ser; ícones nos cartões, no aviso e nas categorias |
| `mobile/__tests__/` | testes ajustados (seção 5) e dublê dos ícones |
| `mobile/package.json` e `app.json` | dependência `@react-native-vector-icons/lucide` e o plugin dela |
| `docs/design.md` | roxo e ícones registrados |
| `docs/pluggy.md` (seção 8) e `docs/requisitos.md` (dúvida 7) | a regra nova e as categorias de investimento |

## 5. Os testes, um por um

### Backend (`financas/tests/test_resumo.py`)

- **`test_saidas_somam_so_a_corrente_e_cartao_fica_na_fatura`** (caso 1; era
  `test_saidas_somam_cartao_e_corrente`): compra de 200 no cartão e aluguel de 1000 na
  corrente dão Saiu 1000.00, e a fatura aberta continua 200.00.
- **`test_pagamento_de_fatura_conta_em_saidas`** (caso 2; substitui o teste com o resultado
  oposto da regra antiga): dois pagamentos de 200, um `Credit card payment` e outro
  `Transfers`, dão Saiu 400.00. Prova que a categoria errada da Pluggy não atrapalha mais.
- **`test_investimento_nao_conta_em_entradas_nem_saidas`** (caso 3): com `Investments` e com
  `Fixed income`, a aplicação e o resgate ficam de fora; só o salário e a padaria contam.
- **`test_exemplo_completo_do_mes`** (caso 4): salário, Pix recebido, débito, pagamento de
  fatura como `Transfers`, aplicação, compra no cartão e transferência entre contas próprias
  no mesmo mês dão Entrou 2423.00 e Saiu 660.29.
- **`test_ultimos_gastos`** (ajustado): uma aplicação com a data de hoje não aparece na lista.

### Mobile

- **Categorias (caso 7):** Groceries dá `shopping-cart`; Food delivery, `utensils`; Gas
  stations, `car`; "Sem categoria" e uma inventada, `ellipsis`. Na tela, o teste dos gastos
  acha os círculos por `testID`.
- **Entrou abre a folha (caso 5):** tocar em "Entrou" mostra "Início do mês" com o valor do
  servidor. Os outros testes da folha também passaram a tocar em Entrou.
- **Saldo não é botão (caso 5):** o rótulo "Saldo: 1.250,50 reais" existe, mas
  `queryByRole('button', ...)` com esse nome é `null`.
- **Dicas (caso 6):** Entrou tem "Toque para mudar o início do mês"; Fatura aberta continua
  com "Toque para mudar o limite da fatura" (agora num teste separado).
- **Dublê dos ícones:** ver [`../jest.md`](../jest.md), seção 16.

Contagem: backend 98 testes; mobile 42.

## 6. Testar à mão

1. Reinicie o backend (`python manage.py runserver 0.0.0.0:8000`); sem `migrate`.
2. `cd mobile && npx expo start --clear` e abra no Expo Go.
3. Confira: régua e carregando em roxo; ícones nos cartões, no aviso e nos gastos.
4. "Entrou" e "Saiu" devem mostrar perto de R$ 2.961,10 e R$ 2.584,56 (os valores mudam com as
   transações novas).
5. Toque em **Entrou**: abre "Início do mês". Toque em **Saldo**: nada acontece.

## 7. Limites e próximos passos

- Um pagamento de fatura que vier como `Transfers` ainda aparece na lista de últimos gastos.
- Qualquer Pix para outra pessoa conta como saída (é o esperado: o dinheiro saiu).
- **Módulo 5:** a seção "Guardado" antes de "Últimos gastos", com os investimentos da Pluggy e
  a meta (RF04, RF28, RF29); as aplicações reconhecidas aqui podem marcar sozinhas o "já
  guardei este mês".
