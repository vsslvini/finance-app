# Requisitos funcionais

Documento do Vinicius: o que o app precisa fazer.

Prioridades:

- **Essencial**: sem isso o app não serve (entra na meta do fim de semana).
- **Desejável**: melhora muito, mas dá para viver sem por enquanto.
- **Depois**: boa ideia, fica para outra fase.

## 1. Objetivo

O app deve agir como um visualizador de gastos: sempre mostrando quanto entrou e quanto
saiu, com um dashboard e informações úteis, e quanto eu posso gastar com base em metas
definidas por mim (ex.: "quero viajar no mês tal e preciso juntar X" ou "quero comprar tal
coisa e preciso juntar X até o mês Y"). Também deve permitir registrar dívidas, para um
controle financeiro fino (ex.: parcelas de uma compra, a dívida da joia comprada com a tia,
a plataforma de estudos para concurso).

## 2. Contas

- **RF01** (Essencial): O app deve mostrar as contas do Nubank, Inter e PicPay, incluindo conta corrente e cartão de crédito de cada banco.
- **RF02** (Essencial): O app deve mostrar o saldo atual de cada conta corrente.
- **RF03** (Essencial): O app deve ter uma visão separada para cada banco e uma visão geral com todos somados.
- **RF04** (Desejável): O app deve mostrar o valor guardado em investimentos (ex.: caixinhas do Nubank). O valor dos investimentos entra como o "já guardado" do plano de guardar (RF28); a Pluggy separa os investimentos por tipo e por instituição. *(complemento de 2026-10-10)*

## 3. Transações (entradas e saídas)

- **RF05** (Essencial): O app deve listar as transações do mês com data, descrição, valor, conta e categoria.
- **RF06** (Essencial): O app deve permitir navegar entre os meses, já que o controle é feito mês a mês.
- **RF07** (Essencial): O app deve categorizar as transações automaticamente, com a categoria vinda dos dados do banco.
- **RF08** (Desejável): O app deve permitir trocar a categoria de uma transação manualmente. *(sugestão do Claude: a categoria automática às vezes erra; vira Essencial se as transações vierem sem categoria, ver dúvida 3)*
- **RF09** (Desejável): O app deve permitir filtrar as transações por conta e por categoria.
- **RF10** (Desejável): O app deve permitir registrar gastos e entradas manuais (ex.: dinheiro em espécie).

## 4. Faturas do cartão

- **RF11** (Essencial): O app deve mostrar o valor da fatura atual (aberta) de cada cartão.
- **RF12** (Essencial): O app deve mostrar o limite total e o limite disponível de cada cartão.
- **RF13** (Essencial): O app deve mostrar uma estimativa do valor das faturas dos próximos meses, calculada a partir das compras parceladas.
- **RF14** (Desejável): O app deve mostrar as datas de fechamento e de vencimento de cada fatura. *(sugestão do Claude)*

## 5. Tela inicial (resumo do mês)

- **RF15** (Essencial): O app deve mostrar o saldo total, somando todas as contas.
- **RF16** (Essencial): O app deve mostrar os últimos gastos.
- **RF17** (Essencial): O app deve mostrar o total de entradas e o total de saídas do mês.
- **RF18** (Essencial): O app deve mostrar quanto eu posso gastar por dia até o fim do mês.
- **RF19** (Depois): O app deve permitir comparar o mês atual com meses anteriores, sem destaque na tela inicial.
- **RF27** (Desejável): O app deve mostrar um relatório do mês com o total de entradas, o total de saídas, o saldo do mês (entradas menos saídas), os gastos somados por categoria (do maior para o menor) e os maiores gastos do mês. Os gastos do mês incluem as faturas do mês (compras no cartão), e não só as saídas das contas correntes. *(pedido em 2026-10-07)*
- **RF30** (Essencial): O mês do app pode começar N dias antes do dia 1 (padrão 0), para o salário recebido no fim do mês contar no mês seguinte. Editável no app, tocando no saldo. *(pedido em 2026-10-10)*

## 6. Metas e dívidas

- **RF20** (Desejável): O app deve permitir cadastrar metas de economia (nome, valor e data limite) e mostrar o progresso de cada uma.
- **RF21** (Desejável): O app deve permitir cadastrar dívidas (descrição, valor total, número de parcelas, quanto já foi pago). Complemento pedido em 2026-10-17: numa aba "Dívidas", cadastrar o valor, para quem, o motivo, as parcelas e o mês de pagamento; a dívida vira parcelas mensais já calculadas (a última leva a sobra dos centavos), e cada parcela não paga conta como saída no mês dela e é descontada do "quanto posso gastar por dia" (ex.: "mês que vem pago X para a minha tia"). Ao pagar de verdade (ex.: um PIX), a parcela é marcada como paga e deixa de contar, porque o pagamento já aparece nas transações. Parcelas não pagas de meses passados aparecem como atrasadas e continuam descontadas do "posso gastar". *(plano no `docs/planos/modulo-12-dividas.md`; adianta a parte de dívidas do RF23)*
- **RF22** (Desejável): O app deve permitir definir um limite de gasto mensal e mostrar um alerta no app quando eu chegar perto dele (ex.: 80%).
- **RF23** (Depois): O "quanto posso gastar por dia" deve descontar o que preciso guardar para as metas e pagar das dívidas.
- **RF28** (Desejável): O app deve permitir definir um plano de guardar dinheiro: um valor por mês e um mês alvo. O app mostra quanto terá guardado até o mês alvo, somando o valor de cada mês, do mês atual até o mês alvo, contando os dois, sem juros (ex.: R$ 500 por mês, de outubro de 2026 a julho de 2027, dá R$ 5.000), mais o que já está guardado em investimentos (RF04). Por enquanto existe um plano só. *(pedido em 2026-10-10)*
- **RF29** (Desejável): O valor do mês do plano de guardar deve ser descontado do "quanto posso gastar por dia" até o app ver que o valor do mês já foi aplicado (aplicações menos resgates na conta corrente, no mês do app), para não descontar duas vezes quando o dinheiro já tiver saído da conta corrente. *(pedido em 2026-10-10; adianta parte do RF23; texto ajustado em 2026-10-17 para seguir o plano do Módulo 5)*
- **RF31** (Desejável): O app deve permitir definir um limite para a fatura do cartão e avisar na tela Início quando a fatura aberta passar dele. Editável no app, tocando na fatura. *(pedido em 2026-10-10; parte do RF22)*

## 7. Atualização dos dados

- **RF24** (Essencial): O app deve buscar dados novos quando eu abrir o app ou puxar a tela para baixo, e mostrar quando foi a última atualização. *(o horário da última atualização é sugestão do Claude)*
- **RF25** (Desejável): O backend deve atualizar os dados sozinho, com a frequência máxima que a Pluggy permitir.

## 8. Acesso e segurança

- **RF26** (Desejável): O app deve pedir a biometria ou a senha do celular ao ser aberto.
- Login com usuário e senha fica para o futuro (ver Fora do escopo).

## 9. Requisitos não funcionais

- **RNF01**: Nenhuma chave da Pluggy nem senha de banco fica guardada no celular.
- **RNF02**: Endereços e credenciais (banco de dados, API, Pluggy) devem ser configuráveis sem mudar o código, para trocar o ambiente de desenvolvimento (Docker) por um servidor caseiro no futuro.
- **RNF03**: A API do backend só deve responder a quem tiver uma chave de acesso, mesmo sendo para uso pessoal. *(sugestão do Claude)*
- **RNF04**: Os valores em dinheiro devem ser exatos até o centavo, sem erros de arredondamento. *(sugestão do Claude)*

## 10. Fora do escopo (por enquanto)

*(sugestões do Claude)*

- Vários usuários e login com conta.
- Versão web.
- Notificações push (o alerta do RF22 aparece só dentro do app).
- Detalhes de investimentos (rentabilidade, histórico); por enquanto, só o valor guardado.
- Fazer qualquer operação nos bancos (pagar, transferir): o app só lê os dados.
- iFood Benefícios (e outros cartões de benefício): sem API oficial; o saldo livre costuma ser transferido para as contas já conectadas, então não muda os cálculos do mês. *(decidido em 2026-10-07)*

## 11. Dúvidas em aberto

Conferido na documentação da Pluggy em 2026-10-04:

- Atualização: no Meu Pluggy, a Pluggy atualiza sozinha a cada 24 horas, e os itens não podem ser atualizados manualmente pela API (conferido em 2026-10-06). O "atualizar agora" do app só relê o que a Pluggy já tem.
- Cartão: o saldo da conta do cartão é a fatura aberta; limite total, limite disponível, fechamento e vencimento vêm prontos.
- Faturas futuras não vêm prontas: precisam ser estimadas a partir das parcelas ("parcela X de Y"), e cada banco devolve as parcelas de um jeito.
- Categorias: vêm automáticas (em inglês, ver abaixo), mas depois do período de teste viram recurso pago; sem ele, a categoria vem vazia.
- O Meu Pluggy é gratuito, não expira com o fim do teste e aceita até 5 conexões, só para uso pessoal (conferido em 2026-10-06; corrige a anotação anterior de que só daria para conectar bancos durante o teste).

Conferido no teste real em 2026-10-07 (detalhes em `docs/pluggy.md`, seção 7):

- Categorias: vêm preenchidas em quase todas as transações, mas **em inglês**; a tradução existe na rota `GET /categories` da Pluggy. Falta decidir como mostrar em português (afeta RF07). Corrige a anotação de que viriam em português.
- A data de fechamento da fatura não vem na fatura aberta (só o vencimento); afeta RF14.
- Parcelas futuras vêm só em parte (algumas só aparecem depois que a fatura fecha); afeta RF13.

Ainda em aberto:

1. ~~Qual a frequência de atualização do Meu Pluggy?~~ Respondida: a cada 24 horas, sem atualização manual (ver acima).
2. ~~As caixinhas do Nubank aparecem como investimento?~~ Respondida em 2026-10-17: sim, como CDB da Nu Financeira (`FIXED_INCOME` / `CDB`), todas com o mesmo nome (ver `docs/pluggy.md`, seção 9). (RF04)
3. ~~As minhas transações vêm com categoria preenchida?~~ Respondida em 2026-10-07: sim, em inglês (ver acima). O app aceita transação sem categoria ("Sem categoria"). (RF07)
4. Quando termina o meu período de teste na pluggy.ai? O acesso ao Meu Pluggy continua depois do teste; falta saber só se as categorias automáticas param de vir (afeta RF07 e RF08).
5. ~~Qual a fórmula do "posso gastar por dia"?~~ Decidido em 2026-10-08: (saldo das contas correntes menos a fatura aberta dos cartões) dividido pelos dias que faltam no mês, contando hoje. (RF18) Mudou em 2026-10-10: saldo das contas correntes dividido pelos dias que faltam no mês do app (RF30), contando hoje, sem descontar a fatura aberta, porque ela é paga com o salário do mês seguinte. A fatura ganha um limite com aviso (RF31).
6. Gastos manuais (RF10) entram no saldo total ou ficam separados?
7. ~~Como somar as faturas nos gastos do mês (RF27, RF17) sem contar duas vezes?~~ Uma compra no cartão é um gasto, e o pagamento da fatura na conta corrente (categoria `Credit card payment`) é outra saída com o mesmo dinheiro. Decidido em 2026-10-08: contar as compras do cartão como gasto e não contar o pagamento da fatura. Mudou em 2026-10-10: entradas e saídas passam a ser contadas só pela conta corrente; o pagamento da fatura conta como saída no mês em que é pago (com o salário seguinte), as compras do cartão ficam só na fatura aberta e aplicações e resgates de investimento não contam. Motivo: no mês real, a regra antiga contou dois pagamentos de fatura (que a Pluggy mandou como `Transfers`) junto com as compras do cartão, e uma aplicação como gasto.
8. ~~Como descontar o plano de guardar sem contar duas vezes?~~ Decidido em 2026-10-10: descontar só o que falta guardar no mês, até o app ver que o valor do mês já foi aplicado (ajustado em 2026-10-17: o app reconhece sozinho, sem botão "já guardei"). (RF29)
