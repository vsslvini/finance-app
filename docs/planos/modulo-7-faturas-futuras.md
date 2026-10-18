# Plano do Módulo 7: faturas futuras (RF13)

Decidido pelo Claude em 2026-10-17, no modo autônomo. 7a é o backend; 7b é a seção "Próximas
faturas" na aba Cartões (depois do Módulo 6, que cria a aba).

## O que os dados reais mostram (conferido em 2026-10-17 no banco de desenvolvimento)

- Cada parcela chega como uma transação do cartão no mês em que foi cobrada, com
  `parcela_atual` e `total_parcelas` (ex.: "REGINALDO ... 2/6" em 29/10/2025, "3/6" em 28/11...).
  A descrição às vezes traz " 2/6" no fim, às vezes não.
- Quase nada vem com data futura (3 transações no banco todo), então as faturas futuras precisam
  ser **projetadas**.
- Há ruído: juros, multa e IOF de renegociação com números de parcela sem sentido
  ("Encerramento de dívida", parcela 3 de 1; estornos positivos).

## Regra da estimativa

1. Considerar só transações de **cartão**, com valor **negativo** (compra) e
   `1 <= parcela_atual <= total_parcelas` (a última parcela vista pode estar num mês futuro e
   ainda contar; "3 de 1" é ruído e fica de fora).
2. Agrupar as parcelas da mesma compra numa **série**: mesma conta, mesmo `total_parcelas`,
   mesmo valor e mesma descrição sem o sufixo " X/Y" (expressão regular no fim do texto).
3. De cada série, usar só a **última parcela vista** (maior `parcela_atual`; empate, a data mais
   recente). Ela é a parcela `a` de `n`, no mês M (mês da data da transação).
4. A série cobra as parcelas `a`, `a+1`, ..., `n` nos meses M, M+1, ..., M+(n-a).
5. A estimativa de um mês futuro F (meses depois do mês atual do app, que usa os dias antes do
   RF30) = soma, em valor positivo, das parcelas de todas as séries que caem em F.
6. Devolver os próximos **6 meses** depois do mês atual, inclusive os que dão zero, com o total
   do mês e o total por cartão.

Limites conhecidos (vão para o documento do módulo): o mês da transação não é exatamente o mês da
fatura (uma compra depois do fechamento cai na fatura seguinte, e a data de fechamento não vem
da Pluggy); compras parceladas que a Pluggy ainda não mandou não entram; duas compras iguais no
mesmo cartão (mesma descrição, valor e número de parcelas) viram uma série só.

## 7a: backend (`python-backend-engineer`)

- `financas/services/faturas_futuras.py`: função pura de agrupamento/projeção (recebe as
  transações e o mês atual, devolve os meses) e a função que busca no banco.
- `GET /api/faturas-futuras/` (com token): lê a `Configuracao` (dias antes) para achar o mês
  atual do app, como o resumo. Resposta:

```json
{
  "meses": [
    {
      "mes": "2026-11",
      "total": "245.30",
      "cartoes": [
        {"conta": 3, "nome_banco": "Nubank", "nome_conta": "gold", "total": "245.30"}
      ]
    }
  ]
}
```

  `cartoes` só traz cartões com total maior que zero, na ordem da API de contas (banco, nome).
  Dinheiro como texto pelo `DecimalField`.

## Casos de teste (7a)

1. Uma compra em 6x com a parcela 2 em outubro (mês atual): novembro a fevereiro ganham o valor
   da parcela cada (parcelas 3 a 6), março não.
2. A mesma série vista em agosto (1/6), setembro (2/6) e outubro (3/6) conta uma vez só (pela
   3/6): não duplica.
3. Parcela que chegou com data futura (novembro, 4/6) conta em novembro e a projeção segue dela
   (dezembro a fevereiro), sem contar novembro duas vezes.
4. Descrições "LOJA X 2/6" e "LOJA X 3/6" são a mesma série (o sufixo " X/Y" é ignorado).
5. Ignora: conta corrente, valor positivo (estorno), parcela maior que o total ("3 de 1"),
   transação sem parcela e série já terminada (6/6 em outubro).
6. Dois cartões: o total do mês soma os dois, e `cartoes` traz cada um com o seu total; cartão sem
   nada no mês não aparece.
7. Sempre 6 meses, começando no mês seguinte ao mês atual do app (com 2 dias antes, em 30/10 o
   mês atual é novembro e a lista começa em dezembro); meses sem parcela vêm com "0.00" e
   `cartoes` vazio; virada de ano certa.
8. A rota exige token (401) e devolve o formato acima com dinheiro como texto.

## 7b: tela (depois do Módulo 6)

Seção "Próximas faturas" embaixo dos cartões na aba Cartões: título (`subtitulo`, header),
explicação curta em `detalhe` ("Estimativa pelas compras parceladas que a Pluggy enviou."), uma
linha por mês ("Novembro de 2026" à esquerda, "R$ 245,30" à direita) e, embaixo de cada mês com
mais de um cartão, o detalhe por cartão em `detalhe`. Casos de teste definidos junto com o 7b.

## 7b: contrato da tela (decidido em 2026-10-17)

- `src/api.ts`: tipos `CartaoFuturo = { conta: number; nome_banco: string; nome_conta: string;
  total: string }`, `MesFuturo = { mes: string; total: string; cartoes: CartaoFuturo[] }`,
  `FaturasFuturas = { meses: MesFuturo[] }` e `buscarFaturasFuturas()`
  (`GET /api/faturas-futuras/`).
- A aba Cartões busca as contas e as faturas futuras juntas, numa função só fora do componente
  (ex.: `buscarDadosDosCartoes`, com `Promise.all`), usada pelo `useCarga`. Se qualquer uma
  falhar, a tela mostra o erro de sempre, e "Tentar de novo" (ou puxar para baixo) busca as duas.
- Seção embaixo dos cartões (só quando há pelo menos um cartão): título "Próximas faturas"
  (`subtitulo`, header), explicação "Estimativa pelas compras parceladas que a Pluggy enviou."
  (`detalhe`) e um cartão `superficie` com uma linha por mês dos 6: à esquerda
  `tituloDoMes(mes)` ("Novembro de 2026", `corpo`), à direita `formatarReais(total)` (`valor`).
  Cada linha é um bloco acessível com `rotuloEmReais(tituloDoMes(mes), total)`
  ("Novembro de 2026: 231,26 reais"). Embaixo de um mês com **mais de um** cartão, uma linha
  `detalhe` por cartão: "Inter: R$ 77,07".
- Se todos os meses vierem com total "0.00": no lugar das linhas, "Nenhuma parcela futura
  encontrada." (`textoSecundario`).

Casos de teste (7b):

1. A seção mostra "Próximas faturas", a explicação e "Novembro de 2026" com "R$ 231,26".
2. Mês com dois cartões mostra "Inter: R$ 77,07" e "PicPay: R$ 154,19"; mês com um cartão só não
   mostra o detalhe.
3. Todos os meses zerados: "Nenhuma parcela futura encontrada." e nenhuma linha de mês.
4. A tela pede `GET /api/faturas-futuras/`; se ele der 500, aparece o erro da tela e "Tentar de
   novo" busca as contas e as faturas de novo.
5. Puxar para baixo busca as duas rotas de novo e mostra o valor novo.
6. Sem nenhum cartão, a seção não aparece (só "Nenhum cartão encontrado.").
