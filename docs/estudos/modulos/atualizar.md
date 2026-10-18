# Módulo 3b-2: atualizar puxando para baixo

Escrito em 2026-10-17. Atende RF24. Plano em
[`../../planos/modulo-3b2-atualizar.md`](../../planos/modulo-3b2-atualizar.md). **Antes, estude**
[`tela-inicio.md`](tela-inicio.md) (como a tela busca o resumo) e
[`guardado-tela.md`](guardado-tela.md) (o combinado entre agentes).

## 1. O que o módulo entrega

- Puxar a tela Início para baixo chama `POST /api/sincronizar/` (o backend lê a Pluggy) e depois
  busca o resumo de novo, sem a tela de "Carregando": os dados antigos ficam visíveis com o
  indicador roxo do celular.
- Embaixo do título do mês: "Atualizado hoje às 14:32", "Atualizado ontem às 09:10",
  "Atualizado em 15/10 às 09:10" ou "Ainda não atualizado".
- Se a sincronização falhar: os dados continuam e aparece "Não foi possível atualizar agora."
- Ao abrir, o app **não** sincroniza (abre rápido); quem quer dados novos puxa para baixo.
- Backend: o resumo ganhou `ultima_atualizacao`. 2 testes novos no backend (137) e 12 no app (67).

Atenção: no Meu Pluggy, a Pluggy lê os bancos a cada 24 horas. "Atualizado às 14:32" é a hora em
que o **nosso backend** leu a Pluggy, não a hora em que a Pluggy leu o banco.

## 2. Conceitos novos

- **`RefreshControl`**: componente do React Native que dá ao `ScrollView` o gesto de puxar para
  baixo. Recebe `refreshing` (mostra ou esconde o indicador; quem controla é o nosso estado
  `atualizando`) e `onRefresh` (a função chamada no gesto). `tintColor` vale no iPhone; `colors`
  e `progressBackgroundColor` no Android.
- **Hora sem converter fuso**: o DRF entrega a hora no fuso do projeto (`TIME_ZONE`), ex.:
  `"2026-10-17T14:32:05-04:00"`. O app só recorta o texto (data nos caracteres 0 a 10, hora de 11
  a 16), como já fazia com as datas. Converter com `new Date()` mudaria a hora conforme o fuso do
  celular.
- **"Ontem" com `Date.UTC`**: para saber o dia anterior a "2026-11-01", a função monta a data em
  UTC e volta um dia; assim a virada de mês e de ano sai certa e o fuso do computador não
  interfere.
- **Função pura com "hoje" de fora**: `textoDaAtualizacao(ultima, hoje)` recebe o dia de hoje
  como parâmetro. Os testes passam qualquer dia sem relógio falso; só a tela pergunta o dia ao
  celular (`hojeNoCelular()`).
- **`pedirApi` com método**: o ajudante da API passou a receber o método (`GET`, `PATCH` ou
  `POST`). O 400 só vira "valor recusado" no `PATCH`; o 502 da Pluggy fora cai em "servidor".

## 3. O caminho de um puxão

1. O gesto chama `atualizar()` em `src/app/index.tsx`, que liga `atualizando`.
2. `sincronizar()` (`src/api.ts`) faz o `POST /api/sincronizar/`; no backend, a view chama o
   `sincronizar()` do service, que lê a Pluggy e grava `ultima_atualizacao` em cada conexão.
3. Deu certo: `buscarResumo()` traz o resumo novo (com `ultima_atualizacao`), que entra na tela
   direto, e um aviso antigo some.
4. Falhou (em qualquer um dos dois): o resumo antigo fica e o aviso aparece.
5. No fim, `atualizando` desliga e o indicador some.

## 4. Arquivos

- `backend/financas/services/resumo.py` e `serializers.py`: o campo `ultima_atualizacao` (o
  `Max` das conexões; `DateTimeField` no serializer).
- `mobile/src/api.ts`: `ultima_atualizacao` no `Resumo`, o método no `pedirApi` e `sincronizar()`.
- `mobile/src/formatacao.ts`: `textoDaAtualizacao` e `hojeNoCelular`.
- `mobile/src/app/index.tsx`: o `RefreshControl`, os estados `atualizando` e `falhouAoAtualizar`,
  a linha "Atualizado ..." e o aviso.
- `docs/design.md`: as duas linhas novas na tabela de estados.

## 5. Os testes

Backend (`financas/tests/test_api_resumo.py`):

- `test_resumo_traz_a_ultima_atualizacao_mais_recente`: com duas conexões, vale a mais recente,
  no formato `"2026-10-17T14:32:00-04:00"` (caso 1).
- `test_resumo_sem_sincronizar_traz_ultima_atualizacao_null`: nunca sincronizou, `null` (caso 2).

App (`__tests__/tela-inicio-test.tsx`): o servidor falso agora responde também o
`POST /api/sincronizar/` (200 por padrão, 502 no caso 7). A função `puxarParaBaixo()` pega o
`ScrollView` pelo `testID="rolagem-inicio"` e chama o `onRefresh` do `RefreshControl` dentro de
`await act(...)`; o `fireEvent(..., 'refresh')` não funciona porque, no Jest, o `onRefresh` fica
no `RefreshControl`, não no `ScrollView`.

- Caso 3: relógio falso ao meio-dia de 17/10; aparece "Atualizado hoje às 14:32".
- Caso 5: com `null`, "Ainda não atualizado".
- Caso 6, dois testes: depois de puxar, o saldo novo aparece e a ordem dos pedidos é resumo,
  sincronizar, resumo; e, segurando o segundo pedido do resumo, a tela de "Carregando" não
  aparece no meio (o saldo antigo continua).
- Caso 7: com 502, aparece o aviso, o saldo antigo continua e o resumo foi pedido uma vez só.

App (`__tests__/formatacao-test.ts`): `textoDaAtualizacao` para hoje, ontem, virada de mês,
virada de ano, outro dia e `null` (casos 3 a 5), e `hojeNoCelular` com relógio falso
(zero à esquerda e o mês do `Date`, que começa em 0).

## 6. Testar à mão

Com o backend no ar e o app aberto no Expo Go, puxe a tela Início para baixo: o indicador roxo
aparece por alguns segundos e a linha muda para "Atualizado hoje às ...". Desligue o backend e
puxe de novo: aparece "Não foi possível atualizar agora." e os valores continuam.

## 7. Limites

- No iPhone, o leitor de tela não anuncia o aviso sozinho (`accessibilityLiveRegion` é só do
  Android).
- Sem testes ainda para: aviso sumindo depois de uma atualização boa e `POST` certo com `GET`
  falhando.
