# Plano do Módulo 3b-2: atualizar puxando para baixo (RF24)

Decidido pelo Claude em 2026-10-17, no modo autônomo (o Vinicius delegou as decisões não críticas). Versão completa; ao abrir, o app só lê o resumo; sincroniza ao puxar para baixo. Casos 1 e 2 (backend): o resumo traz `ultima_atualizacao` com a sincronização mais recente, ou `null` sem nenhuma.

Aviso registrado: no Meu Pluggy os bancos só são lidos pela Pluggy a cada 24 horas; "Atualizado às..." é a hora em que o nosso backend leu a Pluggy, não a hora em que a Pluggy leu o banco.


Projeto: /home/vsslvini/Projetos/app-finacas (app em mobile/). Decidido: versão completa; ao abrir o app NÃO sincroniza (só lê o resumo); sincroniza só ao puxar para baixo.

## API (backend, feito em paralelo pelo Claude)
- GET /api/resumo/ ganha `"ultima_atualizacao": "2026-10-17T14:32:05.123456-04:00"` ou `null` (nunca sincronizou). A hora já vem no fuso local do backend: o app NÃO converte fuso, só recorta o texto (data = caracteres 0..10, hora = 11..16).
- POST /api/sincronizar/ (já existe): 200 com {"ultima_atualizacao": "..."}; 502 com {"detail": "..."} quando a Pluggy falha; 401 sem token.

## Nomes no código
- src/api.ts:
  - `Resumo` ganha `ultima_atualizacao: string | null`.
  - `export async function sincronizar(): Promise<{ ultima_atualizacao: string | null }>`: POST /api/sincronizar/ com o token. O `pedirApi` hoje só faz GET ou PATCH; amplie do jeito mais simples (ex.: um parâmetro de método), sem mudar o comportamento atual. No POST, 400 não é "validacao" (só no PATCH); 502 cai em 'servidor'.
- src/formatacao.ts:
  - `export function textoDaAtualizacao(ultima: string | null, hoje: string): string` (função pura; `hoje` = "AAAA-MM-DD" do celular):
    - null -> "Ainda não atualizado"
    - mesmo dia -> "Atualizado hoje às 14:32"
    - dia anterior (inclusive virada de mês e de ano: hoje "2026-11-01", ultima "2026-10-31...") -> "Atualizado ontem às 09:10"
    - outro dia -> "Atualizado em 15/10 às 09:10"
    - Para saber o dia anterior, faça a conta com Date.UTC nas partes do texto (sem depender do fuso do computador).
  - `export function hojeNoCelular(): string`: "AAAA-MM-DD" a partir de `new Date()` com getFullYear/getMonth/getDate (horário local do celular).
- src/app/index.tsx:
  - O `ScrollView` da tela ganha `testID="rolagem-inicio"` e `refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.acento} colors={[cores.acento]} progressBackgroundColor={cores.superficie} />}`.
  - `atualizar()`: liga `atualizando`, chama `sincronizar()` e depois `buscarResumo()`, e troca o resumo na tela SEM passar pelo estado 'carregando'. Se qualquer um falhar: os dados de antes continuam e aparece o aviso. No fim, desliga `atualizando`. Um aviso antigo some quando uma atualização dá certo.
  - Logo abaixo do título do mês: `<Text style={textos.detalhe}>{textoDaAtualizacao(resumo.ultima_atualizacao, hojeNoCelular())}</Text>`.
  - Aviso de falha, logo abaixo dessa linha: texto exato "Não foi possível atualizar agora." (textos.detalhe, cor `aviso`, `accessibilityLiveRegion="polite"`).

## Casos de teste (todos viram teste)
3. Com ultima_atualizacao de hoje às 14:32, aparece "Atualizado hoje às 14:32" (relógio falso no meio do dia, para não depender do fuso do computador).
4. Ontem: "Atualizado ontem às 09:10"; antes disso: "Atualizado em 15/10 às 09:10" (unitário de textoDaAtualizacao, incluindo virada de mês).
5. null: "Ainda não atualizado".
6. Puxar para baixo chama POST /api/sincronizar/, depois busca o resumo de novo, a tela de "Carregando o resumo..." não aparece, e o novo valor aparece (ex.: a linha "Atualizado ..." muda ou o saldo muda).
7. Sincronização falhando (502): os valores de antes continuam e aparece "Não foi possível atualizar agora."; e nenhum segundo GET do resumo é necessário.
Para disparar o "puxar" no teste: pegar o ScrollView por testID e chamar o onRefresh do refreshControl dentro de act (veja a documentação da RNTL 14 / React Native e escolha o jeito mais limpo).

Regras: sem dependências novas; não commitar; português; sem travessão; seguir o padrão do código e dos testes existentes; os 55 testes atuais continuam verdes (resumos falsos ganham `ultima_atualizacao`, por padrão null ou um valor fixo).
