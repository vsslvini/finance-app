# CLAUDE.md

<!--toc:start-->

- [CLAUDE.md](#claudemd)
  - [Sobre o projeto](#sobre-o-projeto)
  - [Modo deste projeto](#modo-deste-projeto)
  - [Sobre mim](#sobre-mim)
  - [Como trabalhamos](#como-trabalhamos)
  - [Stack e comandos](#stack-e-comandos)
  - [Decisões](#decisões)
  - [Obstáculos e aprendizados](#obstáculos-e-aprendizados)
  - [Ao fim de cada sessão](#ao-fim-de-cada-sessão)

<!--toc:end-->

Documento vivo do projeto. Começa curto e cresce a cada sessão.
Quem decide o que entra aqui é Vinicius. Claude pode propor mudanças,
mas sempre mostra o texto antes e espera aprovação.

## Sobre o projeto

(Vinicius: preencha com suas palavras, duas ou três frases em cada item)

- O que é: Um projeto pessoal para ter controle em tempo real de gastos nos apps de banco, como Pickpay, Inter, e Nubank, além do controle em tempo real das faturas.

- Por que estou fazendo: Preciso aprender a me organizar financeiramente, uma planilha não basta para mim, querto ter uma visão em tempo real de como estou me saindo em ralação a entradas e saidas financieras.

- Pronto quando (meta do fim de semana): Ter uma app rodando e com as principais funcionalidades implementadas.

## Modo deste projeto

- **Modo escolhido: Par.** Claude escreve código, mas só depois do plano aprovado. Vinicius precisa entender cada linha antes do commit.

## Sobre mim

- Sou júnior (estudante de Engenharia de Software). Explique o porquê das decisões, sem jargão desnecessário.
- Prefiro a solução simples à solução elegante.
- Escreva em português do Brasil. Não use travessão; use vírgula, ponto e vírgula ou parênteses.
- Já tive contato com Django REST Framework e com React Native + Expo + TypeScript, mas preciso relembrar: explique sempre o fluxo das coisas. Testes unitários são novidade total: explique cada teste com calma.

## Como trabalhamos

1. **Nada entra em commit sem eu entender.** Antes de cada commit, resuma em linguagem simples o que mudou e por quê. Se eu perguntar sobre uma linha, explique antes de seguir.
2. **Plano antes de código.** Para qualquer feature, primeiro um plano em passos curtos, sem código. Espere minha aprovação. Sempre diga se existe uma versão mais simples.
3. **Testes primeiro.** Eu escrevo os casos em português; você transforma em teste, roda e me mostra falhando antes de implementar.
4. **Um passo por vez.** Cada commit faz uma coisa só e passa nos testes e no lint. Mensagens de commit no padrão de commits semânticos (Conventional Commits), curtas e em português: `tipo(escopo): descrição`. Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`. Escopo opcional: `backend` ou `mobile`.
5. **Seja o freio, sem eu pedir.** Avise quando:
   - algo tiver risco de segurança;
   - você quiser adicionar uma dependência (explique por que e espere aprovação);
   - a solução estiver ficando complicada demais;
   - eu estiver pedindo algo que não deveria ser prioridade agora.
6. **Segredos fora do código.** Senhas, tokens e chaves vão em `.env`, e o `.env` fica no `.gitignore`. Confira isso antes de qualquer commit que envolva configuração.
7. **Não invente.** Se não tiver certeza sobre uma biblioteca ou API, diga, e sugira onde conferir.

## Stack e comandos

(preencher conforme o projeto ganha forma)

- Linguagem e framework: backend em Python com Django REST Framework (testes com pytest + pytest-django); banco PostgreSQL rodando no Docker; app mobile em React Native com Expo e TypeScript (testes com Jest + React Native Testing Library); dados bancários via Meu Pluggy.
- Para depois: Expo Router, Zod e outros detalhes, adicionados conforme a necessidade.
- Rodar o projeto: `docker compose up -d` sobe o PostgreSQL (`docker compose down` desliga e mantém os dados; `down -v` apaga os dados). Backend e app: (a definir)
- Rodar os testes: (a definir)
- Rodar o lint: (a definir)

## Decisões

(formato: data, decisão, por quê)

- 2026-10-03, integração com bancos via Meu Pluggy (gratuito para uso pessoal), porque é o caminho oficial (Open Finance) sem pedir senha do banco no app.
- 2026-10-03, chaves da Pluggy e senha do banco só no `.env` do backend, porque tudo que vai para o celular pode ser lido.
- 2026-10-03, PostgreSQL no Docker, porque é o padrão com Django e fica isolado do sistema.
- 2026-10-03, monorepo com `backend/` (Django) e `mobile/` (Expo) no mesmo repositório, porque é um projeto pessoal e fica mais simples versionar tudo junto.
- 2026-10-03, um único `.env` na raiz, lido pelo docker-compose e pelo Django; o `.env.example` documenta as variáveis sem valores reais.
- 2026-10-03, o Docker roda só o PostgreSQL; o Django roda local num ambiente virtual, porque é mais simples de depurar.

## Obstáculos e aprendizados

(formato: data, problema, como resolvemos, o que aprendi)

- 2026-10-03, o banco não subiu porque o `.env` não existia e o Docker trocou as variáveis por texto vazio (só com um aviso); resolvemos usando `${VAR:?mensagem}` no docker-compose, que faz o Docker parar com erro claro quando falta uma variável. Aprendi: falhar cedo e com mensagem clara é melhor do que seguir com valor vazio.

## Ao fim de cada sessão

Quando eu disser que vamos fechar a sessão:

1. Rode testes e lint e confirme que passam.
2. Proponha de uma a três linhas para "Decisões" ou "Obstáculos e aprendizados". Mostre o texto e espere minha aprovação antes de gravar.
3. Se surgiu algum comando novo, proponha atualizar "Stack e comandos".
4. Diga qual é o próximo passo pequeno, para eu saber por onde recomeçar.
