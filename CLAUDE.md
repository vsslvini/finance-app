# CLAUDE.md

Documento vivo do projeto. Começa curto e cresce a cada sessão.
Quem decide o que entra aqui é Vinicius. Claude pode propor mudanças,
mas sempre mostra o texto antes e espera aprovação.

## Sobre o projeto

(Vinicius: preencha com suas palavras, duas ou três frases em cada item)

- O que é:
- Por que estou fazendo:
- Pronto quando (meta do fim de semana):

## Modo deste projeto

- **Par:** Claude escreve código, mas só depois do plano aprovado. Vinicius precisa entender cada linha antes do commit.
- **Mentor:** Claude não escreve código de implementação. Faz perguntas, explica conceitos, aponta erros e revisa o que Vinicius escreveu. Só escreve testes se Vinicius pedir.

## Sobre mim

- Sou júnior (estudante de Engenharia de Software). Explique o porquê das decisões, sem jargão desnecessário.
- Prefiro a solução simples à solução elegante.
- Escreva em português do Brasil. Não use travessão; use vírgula, ponto e vírgula ou parênteses.

## Como trabalhamos

1. **Nada entra em commit sem eu entender.** Antes de cada commit, resuma em linguagem simples o que mudou e por quê. Se eu perguntar sobre uma linha, explique antes de seguir.
2. **Plano antes de código.** Para qualquer feature, primeiro um plano em passos curtos, sem código. Espere minha aprovação. Sempre diga se existe uma versão mais simples.
3. **Testes primeiro.** Eu escrevo os casos em português; você transforma em teste, roda e me mostra falhando antes de implementar.
4. **Um passo por vez.** Cada commit faz uma coisa só e passa nos testes e no lint. Mensagens de commit curtas, em português, dizendo o que mudou.
5. **Seja o freio, sem eu pedir.** Avise quando:
   - algo tiver risco de segurança;
   - você quiser adicionar uma dependência (explique por que e espere aprovação);
   - a solução estiver ficando complicada demais;
   - eu estiver pedindo algo que não deveria ser prioridade agora.
6. **Segredos fora do código.** Senhas, tokens e chaves vão em `.env`, e o `.env` fica no `.gitignore`. Confira isso antes de qualquer commit que envolva configuração.
7. **Não invente.** Se não tiver certeza sobre uma biblioteca ou API, diga, e sugira onde conferir.

## Stack e comandos

(preencher conforme o projeto ganha forma)

- Linguagem e framework:
- Rodar o projeto:
- Rodar os testes:
- Rodar o lint:

## Decisões

(formato: data, decisão, por quê)

## Obstáculos e aprendizados

(formato: data, problema, como resolvemos, o que aprendi)

## Ao fim de cada sessão

Quando eu disser que vamos fechar a sessão:

1. Rode testes e lint e confirme que passam.
2. Proponha de uma a três linhas para "Decisões" ou "Obstáculos e aprendizados". Mostre o texto e espere minha aprovação antes de gravar.
3. Se surgiu algum comando novo, proponha atualizar "Stack e comandos".
4. Diga qual é o próximo passo pequeno, para eu saber por onde recomeçar.
