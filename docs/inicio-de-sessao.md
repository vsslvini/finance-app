# Início de sessão

Roteiro para o Claude no começo de cada sessão. Para usar, o Vinicius escreve:

> Leia `docs/inicio-de-sessao.md` e siga o roteiro.

## 1. Leia, nesta ordem

1. `CLAUDE.md`: regras de trabalho, decisões e, principalmente, a seção "Estado atual e próximos passos". Ela diz onde paramos e vale mais do que qualquer outro arquivo.
2. `docs/requisitos.md`: o que o app precisa fazer (códigos RFxx e RNFxx, com prioridade). A seção "Dúvidas em aberto" lista o que ainda não foi decidido.
3. `docs/arquitetura.md`: como o app é montado (caminho dos dados, models, rotas da API, segurança) e a ordem de implementação na seção 5.
4. `.claude/agents/`: os agentes e o que cada um pode fazer.

## 2. Confira o repositório

- `git log --oneline -10` e `git status`: veja o último commit e se ficou algo sem commit. Se o estado do git não bater com o "Estado atual" do `CLAUDE.md`, avise o Vinicius antes de seguir.
- Testes e lint o Claude pode rodar; servidor e comandos que mexem no banco ficam com o Vinicius (regra 8 do `CLAUDE.md`).

## 3. Diga ao Vinicius, em poucas linhas

- Onde paramos (último passo concluído).
- Qual é o próximo passo pequeno, com o código do requisito ou o número do passo da arquitetura.
- O que você precisa dele para começar (ex.: casos de teste em português, uma decisão, um dado do painel da Pluggy).

Depois, espere a resposta. Não comece código sem plano aprovado.

## 4. Como cada módulo anda

1. **Plano do módulo** em passos curtos, sem código, com os casos de teste em português, dizendo se existe uma versão mais simples. Espere a aprovação.
2. **Testes e implementação** pelo agente certo, no mesmo módulo; todo caso aprovado vira teste.
3. **Verificação**: Claude roda testes e lint e mostra o resultado. Comandos que mexem no banco de desenvolvimento (`migrate`, token, usuário) ficam com o Vinicius.
4. **Documento do módulo** em `docs/estudos/modulos/<nome>.md`: fluxo de uma requisição, cada arquivo e o porquê, cada teste explicado, comandos para testar à mão.
5. **Resumo** em linguagem simples do que foi feito e por quê, antes do commit.
6. **Commits** (um a três por módulo), no padrão `tipo(escopo): descrição`, só com a aprovação do Vinicius.

Qual agente usar:

| Tarefa | Agente |
|---|---|
| Backend Django (models, rotas, Pluggy) e testes pytest | `python-backend-engineer` |
| Proposta ou revisão de telas (não escreve código) | `mobile-ui-expert` |
| Testes do app (Jest + React Native Testing Library) | `mobile-tester` |
| Código das telas e chamadas à API | `react-native-expert` |

Os agentes não rodam comandos nem fazem commit. Ao chamar um agente, passe o plano aprovado e os casos de teste; ao receber o relatório, resuma para ele antes de qualquer commit.

## 5. Lembretes

- Português do Brasil, sem travessão; explique o porquê das decisões, sem jargão.
- Seja o freio: avise sobre risco de segurança, dependência nova, solução complicada ou prioridade fora de hora.
- Não invente: dúvidas sobre Pluggy, Django, DRF ou Expo se resolvem na documentação oficial.
- Ao fim da sessão, siga a seção "Ao fim de cada sessão" do `CLAUDE.md` e atualize o "Estado atual".
