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
  - [Estado atual e próximos passos](#estado-atual-e-próximos-passos)
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
8. **Eu rodo os comandos.** Testes, lint e servidor são rodados por mim; Claude explica antes o que cada comando faz e o que esperar. Claude pode deixar partes pequenas de código para eu escrever, com dicas.
9. **Trabalho com agentes.** As tarefas são feitas pelos agentes do projeto (`.claude/agents/`): `python-backend-engineer` no backend; `react-native-expert` nas telas; `mobile-tester` nos testes do app; `mobile-ui-expert` no planejamento das telas (só propõe, não escreve código). Os agentes não rodam comandos nem fazem commit; Claude resume para mim o que cada um fez antes de qualquer commit.

## Stack e comandos

(preencher conforme o projeto ganha forma)

- Linguagem e framework: backend em Python com Django REST Framework (testes com pytest + pytest-django); banco PostgreSQL rodando no Docker; app mobile em React Native com Expo e TypeScript (testes com Jest + React Native Testing Library); dados bancários via Meu Pluggy.
- Para depois: Expo Router, Zod e outros detalhes, adicionados conforme a necessidade.
- Rodar o projeto: `docker compose up -d` sobe o PostgreSQL (`docker compose down` desliga e mantém os dados; `down -v` apaga os dados). App mobile: (a definir)
- Preparar o backend: `cd backend && python -m venv .venv && source .venv/bin/activate.fish && pip install -r requirements-dev.txt` (no fish o arquivo é `activate.fish`; no bash é `activate`)
- Rodar o backend: `python manage.py runserver` (com o banco do Docker no ar)
- Depois de mudar um model: `python manage.py makemigrations` (gera o arquivo da migration, que entra no commit) e `python manage.py migrate` (cria ou altera as tabelas no banco)
- Admin do Django: `python manage.py createsuperuser` (uma vez) e, com o `runserver` no ar, abrir `http://127.0.0.1:8000/admin/`
- Rodar os testes (backend): `cd backend && pytest` (`-v` mostra o nome de cada teste; `--co` só lista os testes encontrados; `pytest caminho/test_x.py::test_nome` roda um teste só)
- Conferir se o backend está vivo: com o `runserver` no ar, abrir `http://127.0.0.1:8000/api/health/`
- Rodar o lint (backend): `cd backend && ruff check . && ruff format --check .` (para corrigir: `ruff check . --fix` e depois `ruff format .`)

## Decisões

(formato: data, decisão, por quê)

- 2026-10-03, integração com bancos via Meu Pluggy (gratuito para uso pessoal), porque é o caminho oficial (Open Finance) sem pedir senha do banco no app.
- 2026-10-03, chaves da Pluggy e senha do banco só no `.env` do backend, porque tudo que vai para o celular pode ser lido.
- 2026-10-03, PostgreSQL no Docker, porque é o padrão com Django e fica isolado do sistema.
- 2026-10-03, monorepo com `backend/` (Django) e `mobile/` (Expo) no mesmo repositório, porque é um projeto pessoal e fica mais simples versionar tudo junto.
- 2026-10-03, um único `.env` na raiz, lido pelo docker-compose e pelo Django; o `.env.example` documenta as variáveis sem valores reais.
- 2026-10-03, o Docker roda só o PostgreSQL; o Django roda local num ambiente virtual, porque é mais simples de depurar.
- 2026-10-03, Django 6.1.1 com DRF 3.18.1 e versões fixadas (`==`) nos requirements, para instalações sempre iguais; `requirements-dev.txt` separado com as ferramentas de teste e lint.
- 2026-10-03, projeto Django chamado `config` (só configurações); funcionalidades ficam em apps separados.
- 2026-10-03, todas as rotas da API ficam sob `/api/`; cada app tem seu próprio `urls.py`, ligado no `config/urls.py` com `include`.
- 2026-10-03, testes ficam dentro de cada app, numa pasta `tests/` com arquivos `test_*.py` (ex.: `core/tests/test_health.py`); configuração do pytest e do ruff no `backend/pyproject.toml`.
- 2026-10-04, Expo Router entra no projeto; o `AGENTS.md` gerado pelo Expo fica como está (rotas em `mobile/src/app/`).
- 2026-10-04, ordem de trabalho: primeiro os requisitos funcionais (em `docs/requisitos.md`), depois a arquitetura, e só então telas e API, com os testes escritos junto.
- 2026-10-04, o trabalho passa a ser feito com agentes do Claude Code, definidos em `.claude/agents/` e versionados no repositório.
- 2026-10-04, o backend guarda uma cópia dos dados da Pluggy no PostgreSQL e o app lê só do backend, porque a Pluggy limita atualizações e dados manuais (categoria, metas, dívidas) precisam morar junto.
- 2026-10-04, chamadas à Pluggy com `requests` (em vez do SDK oficial), porque deixa o fluxo HTTP visível e é simples de testar.
- 2026-10-04, API protegida com token do DRF; no mobile, o token fica por enquanto no `.env` do Expo (risco aceito para uso pessoal) e depois vai para o `expo-secure-store`.
- 2026-10-05, a `Conta` também guarda o id da Pluggy (único, vazio permitido), para o `sincronizar()` atualizar a conta existente em vez de duplicar.
- 2026-10-05, as ligações entre `Conexao`, `Conta` e `Transacao` usam `on_delete=PROTECT`, para que apagar uma conexão por engano no admin não leve junto gastos e categorias manuais.

## Obstáculos e aprendizados

(formato: data, problema, como resolvemos, o que aprendi)

- 2026-10-03, o banco não subiu porque o `.env` não existia e o Docker trocou as variáveis por texto vazio (só com um aviso); resolvemos usando `${VAR:?mensagem}` no docker-compose, que faz o Docker parar com erro claro quando falta uma variável. Aprendi: falhar cedo e com mensagem clara é melhor do que seguir com valor vazio.
- 2026-10-03, `ruff check --fix` removeu imports não usados, mas deixou linhas em branco que o `ruff format --check` acusou; resolvemos rodando `ruff format`. Aprendi: `check` (regras) e `format` (formatação) são verificações diferentes, e as duas precisam passar.
- 2026-10-03, `.env` e `.venv` não apareciam no explorador do LazyVim (snacks.nvim); `H` mostra só arquivos ocultos, e `I` mostra os ignorados pelo git. Aprendi: se some do explorador, pode ser o `.gitignore` funcionando.
- 2026-10-03, primeiro teste com TDD (vermelho com 404, depois verde). Entendi o fluxo do código, mas ainda não o funcionamento interno do pytest (descoberta de testes, plugins, reescrita do `assert`); vou estudar por fora (docs.pytest.org, seção "Get Started"; livro "Python Testing with pytest", de Brian Okken).
- 2026-10-05, os testes dos models passaram sem que a migration tivesse sido criada, porque o pytest-django cria as tabelas direto dos models quando o app não tem migrations; o banco de desenvolvimento ficaria sem as tabelas. Resolvemos rodando `makemigrations` antes do commit. Aprendi: teste verde não garante que a migration existe; conferir com `git status` se a pasta `migrations/` entrou.

## Estado atual e próximos passos

(atualizar ao fim de cada sessão; vale só o estado mais recente)

**Onde paramos (2026-10-05):**

- Feito: backend com `/api/health/`; models `Conexao`, `Conta` e `Transacao` no app `financas`, com admin, migration e 7 testes (passo 2 da arquitetura); projeto Expo com TypeScript e lint; agentes em `.claude/agents/`; requisitos em `docs/requisitos.md`; arquitetura em `docs/arquitetura.md`.
- Pendência do backend: criar o usuário do admin (`python manage.py createsuperuser`) e cadastrar as conexões com os ids copiados do painel da Pluggy.
- Pendências do mobile: Expo Router ainda não instalado (o projeto usa `App.tsx`); `@testing-library/react-native` e `@types/jest` estão em `dependencies` (deveriam estar em `devDependencies`); faltam `jest`, `jest-expo` e o script `"test"`.
- Para recomeçar: ler `docs/inicio-de-sessao.md` (roteiro para o Claude); `docker compose up -d`, depois `cd backend && source .venv/bin/activate.fish && pytest`.

**Próximos passos, em ordem (detalhes em `docs/arquitetura.md`, seção 5):**

1. Passo 3 da arquitetura: cliente da Pluggy (`requests`, já aprovada) e `sincronizar()`, com testes usando respostas falsas da Pluggy (sem internet); credenciais da Pluggy no `.env`. Antes do plano, conferir na documentação da Pluggy as rotas de contas e transações e o formato das respostas.
2. Passo 4: token e rotas de contas e transações.
3. Passo 1 (base do mobile) antes de começar as telas.

## Ao fim de cada sessão

Quando eu disser que vamos fechar a sessão:

1. Rode testes e lint e confirme que passam.
2. Proponha de uma a três linhas para "Decisões" ou "Obstáculos e aprendizados". Mostre o texto e espere minha aprovação antes de gravar.
3. Se surgiu algum comando novo, proponha atualizar "Stack e comandos".
4. Diga qual é o próximo passo pequeno, para eu saber por onde recomeçar.
