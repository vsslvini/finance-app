// Conversa com o backend Django. O app só fala com rotas sob /api/.

// Um gasto da lista "últimos gastos" (mesmos campos do TransacaoSerializer)
export type GastoResumo = {
  id: number;
  data: string; // "2026-10-08"
  descricao: string;
  valor: string; // texto decimal, negativo para saída: "-45.90"
  conta: number; // id da conta
  nome_conta: string;
  nome_banco: string;
  // O texto para mostrar, já em português: "Mercado" (ou "Sem categoria")
  categoria: string;
  // O nome em inglês, como a Pluggy manda: "Groceries" ("" sem categoria).
  // Serve para escolher o ícone e para marcar a categoria atual na troca
  categoria_original: string;
  parcela_atual: number | null;
  total_parcelas: number | null;
};

// Uma transação da tela Transações. O backend usa o mesmo TransacaoSerializer
// nos "últimos gastos" do resumo e em /api/transacoes/, então o tipo é o mesmo.
export type Transacao = GastoResumo;

// Uma categoria de GET /api/categorias/, para a folha de trocar a categoria.
// "descricao" é o nome em inglês (é o que vai no PATCH); "nome" é o que aparece
export type Categoria = {
  descricao: string; // "Groceries"
  nome: string; // "Mercado"
};

// Uma conta de GET /api/contas/ (mesmos campos do ContaSerializer)
export type Conta = {
  id: number;
  nome: string; // "Conta Corrente", "Mastercard Black"
  nome_banco: string; // "Nubank"
  tipo: 'corrente' | 'cartao';
  saldo: string; // no cartão, é o valor da fatura aberta: "845.10"
  // Os quatro abaixo só existem no cartão (null na conta corrente, e às vezes
  // a Pluggy não manda no cartão também)
  limite_total: string | null; // "5000.00"
  limite_disponivel: string | null; // "4154.90"
  data_fechamento: string | null; // "2026-10-28"
  data_vencimento: string | null; // "2026-11-05"
};

// Resposta de GET e PATCH /api/plano/. Os dois null = sem plano.
export type PlanoDeGuardar = {
  valor_mensal: string | null; // "500.00"
  mes_alvo: string | null; // "2027-07"
};

// Bloco "guardado" do resumo (investimentos e plano de guardar)
export type Guardado = {
  total: string; // soma dos investimentos hoje: "1300.00"
  este_mes: string; // quanto entrou neste mês; negativo se resgatou mais do que aplicou
  plano: PlanoDeGuardar | null; // null sem plano (com plano, os dois campos vêm preenchidos)
  previsto: string | null; // quanto haverá no mês alvo; null sem plano
  progresso: number | null; // porcentagem inteira (pode passar de 100); null sem plano
  falta_guardar_no_mes: string; // já descontado do "posso gastar"; "0.00" sem plano
};

// Resposta de GET /api/resumo/ (mesmos campos do ResumoSerializer)
export type Resumo = {
  mes: string; // "2026-10"
  dia_do_mes: number | null; // null quando não é o mês de hoje
  dias_no_mes: number | null;
  saldo_total: string;
  fatura_aberta: string;
  limite_fatura: string | null; // null quando não há limite
  fatura_acima_do_limite: boolean;
  entradas: string;
  saidas: string;
  posso_gastar_por_dia: string | null; // null quando não é o mês de hoje
  ultimos_gastos: GastoResumo[];
  guardado: Guardado;
  // Hora da última sincronização com a Pluggy, já no fuso do backend:
  // "2026-10-17T14:32:05.123456-04:00"; null quando nunca sincronizou
  ultima_atualizacao: string | null;
  // Soma das parcelas de dívidas não pagas do mês (já dentro de "saidas") e das
  // atrasadas (de meses anteriores). "0.00" quando não há nada
  dividas_do_mes: string;
  dividas_atrasadas: string;
  // Gastos fixos a pagar no mês (já dentro de "saidas"); "0.00" quando não há
  fixos_do_mes: string;
  // Gasto previsto (sempre do mês atual do app); ausente = o cartão não aparece
  previsto?: Previsto;
};

// Uma fatura de cartão dentro do gasto previsto
export type FaturaPrevista = {
  conta: number; // id da conta do cartão
  nome_banco: string; // "Nubank"
  nome_conta: string; // "gold"
  valor: string; // "358.32"
};

// O que falta pagar em um mês, separado por origem
export type MesPrevisto = {
  mes: string; // "2026-10"
  total: string;
  faturas: FaturaPrevista[];
  fixos: string;
  dividas: string;
};

// O mês atual também traz as parcelas atrasadas (de meses anteriores)
export type MesAtualPrevisto = MesPrevisto & { atrasadas: string };

export type Previsto = {
  mes_atual: MesAtualPrevisto;
  proximo_mes: MesPrevisto;
};

export type SituacaoDoGastoFixo =
  | 'a_pagar'
  | 'pago_manual'
  | 'pago_automatico'
  | 'nao_comecou';

// Um gasto fixo de GET /api/gastos-fixos/ (e a resposta de POST, PATCH, PUT e DELETE do pagamento)
export type GastoFixo = {
  id: number;
  nome: string; // "Apartamento"
  valor: string; // "1200.00"
  dia_vencimento: number | null;
  mes_inicio: string; // "2026-10"
  trecho_descricao: string; // pode vir vazio
  este_mes: { mes: string; situacao: SituacaoDoGastoFixo };
};

// O que o app manda para cadastrar (POST) ou editar (PATCH) um gasto fixo
export type DadosDoGastoFixo = {
  nome: string;
  valor: string;
  dia_vencimento: number | null;
  mes_inicio: string;
  trecho_descricao: string;
};

// Uma parcela de uma dívida (dentro de GET /api/dividas/)
export type ParcelaDaDivida = {
  id: number;
  numero: number; // 1, 2, 3...
  mes: string; // "2026-11"
  valor: string; // "333.33"
  paga: boolean;
  atrasada: boolean; // não paga e de um mês anterior ao mês atual do app
};

// A próxima parcela a pagar (a primeira não paga), sem o campo "paga"
export type ProximaParcela = {
  id: number;
  numero: number;
  mes: string; // "2026-11"
  valor: string;
  atrasada: boolean;
};

// Uma dívida de GET /api/dividas/ (e a resposta de POST e dos PATCH)
export type Divida = {
  id: number;
  credor: string; // para quem se deve: "Tia Maria"
  motivo: string; // pode vir vazio
  valor_total: string; // "1000.00"
  total_parcelas: number;
  parcelas_pagas: number;
  valor_pago: string;
  valor_restante: string;
  mes_inicio: string; // mês da primeira parcela: "2026-11"
  proxima_parcela: ProximaParcela | null; // null quando tudo está pago
  parcelas: ParcelaDaDivida[];
};

// O que o app manda para cadastrar uma dívida (POST /api/dividas/)
export type NovaDivida = {
  credor: string;
  motivo: string;
  valor_total: string; // "1000.00"
  parcelas: number;
  mes_inicio: string; // "2026-11"
};

// Um cartão dentro de um mês de GET /api/faturas-futuras/
export type CartaoFuturo = {
  conta: number; // id da conta do cartão
  nome_banco: string; // "Nubank"
  nome_conta: string; // "gold"
  total: string; // soma das parcelas deste cartão no mês: "245.30"
};

// Um mês de GET /api/faturas-futuras/. "cartoes" só traz os cartões com total
// maior que zero (vazio num mês sem parcelas), na ordem da API de contas.
export type MesFuturo = {
  mes: string; // "2026-11"
  total: string; // soma de todos os cartões no mês: "245.30" ou "0.00"
  cartoes: CartaoFuturo[];
};

// Resposta de GET /api/faturas-futuras/: sempre os 6 meses depois do mês atual do app
export type FaturasFuturas = {
  meses: MesFuturo[];
};

// Uma categoria do relatório do mês (o total dos gastos dessa categoria)
export type CategoriaDoMes = {
  categoria: string; // o nome em português: "Transferência - PIX" (ou "Sem categoria")
  categoria_original: string; // o nome em inglês, para o ícone: "Transfer - PIX"
  total: string; // sempre positivo: "1079.17"
  porcentagem: number; // inteiro, de 0 a 100, arredondado para baixo pelo backend
};

// Resposta de GET /api/relatorio/. Entradas, saídas e saldo do mês são os
// mesmos números do resumo; o total de gastos inclui as compras do cartão
export type Relatorio = {
  mes: string; // "2026-10"
  entradas: string; // "3205.10"
  saidas: string; // "2812.06"
  saldo_do_mes: string; // entradas menos saídas; pode ser negativo: "-290.00"
  total_gastos: string; // "2849.58" ("0.00" sem gastos)
  gastos_por_categoria: CategoriaDoMes[]; // do maior para o menor
  maiores_gastos: Transacao[]; // até 5, do maior para o menor
};

// Resposta de GET e PATCH /api/configuracoes/
export type Configuracoes = {
  dias_antes_do_mes: number;
  limite_fatura: string | null; // "1000.00" ou null (sem limite)
};

// Tempo máximo de espera pela resposta do servidor (15 segundos)
export const LIMITE_DE_TEMPO_MS = 15000;

export type TipoErroApi = 'conexao' | 'token' | 'servidor' | 'validacao';

// Erro com um "tipo", para a tela escolher a mensagem certa.
// No tipo 'validacao', "mensagem" traz o texto que o backend mandou.
export class ErroApi extends Error {
  tipo: TipoErroApi;
  mensagem?: string;

  constructor(tipo: TipoErroApi, mensagem?: string) {
    super(`Erro na API: ${tipo}`);
    this.name = 'ErroApi';
    this.tipo = tipo;
    this.mensagem = mensagem;
    // Garante que "erro instanceof ErroApi" funcione mesmo se o código for
    // transformado para uma versão antiga de JavaScript
    Object.setPrototypeOf(this, ErroApi.prototype);
  }
}

// O DRF responde 400 com { "campo": ["mensagem"] }. Devolve a primeira
// mensagem encontrada, ou "Valor inválido." se não achar nenhuma.
async function primeiraMensagem(response: Response): Promise<string> {
  try {
    const dados: unknown = await response.json();
    if (typeof dados === 'object' && dados !== null) {
      for (const valor of Object.values(dados)) {
        if (typeof valor === 'string') {
          return valor;
        }
        if (Array.isArray(valor) && typeof valor[0] === 'string') {
          return valor[0];
        }
      }
    }
  } catch {
    // A resposta não era JSON: usamos a mensagem padrão abaixo
  }
  return 'Valor inválido.';
}

// Os métodos HTTP que o app usa: GET lê, PATCH salva campos, POST pede uma ação
// (a sincronização com a Pluggy) ou cria algo (uma dívida), PUT marca algo sem
// corpo (o pagamento de um gasto fixo), DELETE apaga
type Metodo = 'GET' | 'PATCH' | 'POST' | 'PUT' | 'DELETE';

// Ajudante usado por todas as funções da API: faz o fetch com o token, aplica o
// limite de tempo e traduz o status da resposta em ErroApi.
// "corpo" é o que vai em JSON (só o PATCH manda).
async function pedirApi<T>(caminho: string, metodo: Metodo = 'GET', corpo?: object): Promise<T> {
  // Lidas aqui dentro (a cada chamada) para os testes poderem trocar os valores.
  // Sempre com ponto: o Expo só troca a forma process.env.EXPO_PUBLIC_X
  const url = process.env.EXPO_PUBLIC_API_URL;
  const token = process.env.EXPO_PUBLIC_API_TOKEN;

  // O AbortController cancela o fetch se passar do limite de tempo
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITE_DE_TEMPO_MS);

  const opcoes: RequestInit = {
    headers: { Authorization: `Token ${token}` },
    signal: controller.signal,
  };
  // O GET vai sem "method", porque é o padrão do fetch (como sempre foi)
  if (metodo !== 'GET') {
    opcoes.method = metodo;
  }
  // Com corpo, avisamos ao servidor que ele vai em JSON
  if (corpo !== undefined) {
    opcoes.headers = {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    };
    opcoes.body = JSON.stringify(corpo);
  }

  try {
    let response: Response;
    try {
      response = await fetch(`${url}${caminho}`, opcoes);
    } catch {
      // Sem rede, servidor desligado ou tempo esgotado (abort)
      throw new ErroApi('conexao');
    }

    if (response.status === 401) {
      throw new ErroApi('token');
    }
    // 400 só é "valor recusado" quando estamos salvando: PATCH, ou POST com
    // corpo (cadastrar dívida). Num GET, num POST sem corpo (a sincronização)
    // ou num DELETE, um 400 vem de configuração do servidor (ex.: ALLOWED_HOSTS)
    // e cai em 'servidor'
    const estaSalvando = metodo === 'PATCH' || (metodo === 'POST' && corpo !== undefined);
    if (response.status === 400 && estaSalvando) {
      throw new ErroApi('validacao', await primeiraMensagem(response));
    }
    // Aqui também caem o 500 e o 502 (a Pluggy falhou na sincronização)
    if (!response.ok) {
      throw new ErroApi('servidor');
    }
    // 204 = deu certo e a resposta vem sem corpo (o DELETE); não há JSON para ler
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } finally {
    // Sempre desliga o timer, deu certo ou não
    clearTimeout(timer);
  }
}

export async function buscarResumo(): Promise<Resumo> {
  return pedirApi<Resumo>('/api/resumo/');
}

// Todas as contas (correntes e cartões), já ordenadas pelo backend por banco e
// nome. As telas Cartões e Contas usam a mesma rota e escolhem o que mostrar.
export async function buscarContas(): Promise<Conta[]> {
  return pedirApi<Conta[]>('/api/contas/');
}

// A estimativa das próximas faturas, feita pelo backend a partir das compras
// parceladas do cartão. O app só mostra; a conta toda fica no backend.
export async function buscarFaturasFuturas(): Promise<FaturasFuturas> {
  return pedirApi<FaturasFuturas>('/api/faturas-futuras/');
}

// As transações de um mês do app ("2026-10"), da mais nova para a mais antiga.
// O backend já aplica o "mês começando dias antes", então o app só manda o mês.
export async function buscarTransacoes(mes: string): Promise<Transacao[]> {
  return pedirApi<Transacao[]>(`/api/transacoes/?mes=${mes}`);
}

// O relatório de um mês do app. Sem "mes", o backend usa o mês atual do app
// (já com o "mês começando dias antes") e devolve qual é ele no campo "mes".
// A tela Relatório faz o primeiro pedido assim, e as setas mandam o mês.
export async function buscarRelatorio(mes?: string): Promise<Relatorio> {
  const caminho = mes === undefined ? '/api/relatorio/' : `/api/relatorio/?mes=${mes}`;
  return pedirApi<Relatorio>(caminho);
}

// As categorias que podem ser escolhidas, já em ordem alfabética do "nome"
export async function buscarCategorias(): Promise<Categoria[]> {
  return pedirApi<Categoria[]>('/api/categorias/');
}

// Troca a categoria de uma transação. "categoriaManual" é a "descricao" (em
// inglês) de uma categoria da lista, ou "" para voltar à categoria do banco.
// O backend devolve a transação já com a categoria nova.
export async function trocarCategoria(id: number, categoriaManual: string): Promise<Transacao> {
  return pedirApi<Transacao>(`/api/transacoes/${id}/`, 'PATCH', {
    categoria_manual: categoriaManual,
  });
}

export async function buscarConfiguracoes(): Promise<Configuracoes> {
  return pedirApi<Configuracoes>('/api/configuracoes/');
}

// Manda só os campos que mudaram (PATCH) e recebe as configurações completas
export async function salvarConfiguracoes(
  mudancas: Partial<Configuracoes>,
): Promise<Configuracoes> {
  return pedirApi<Configuracoes>('/api/configuracoes/', 'PATCH', mudancas);
}

// Pede ao backend para buscar os dados novos na Pluggy agora (POST, sem corpo).
// Devolve a hora da sincronização; o resumo novo é buscado depois, à parte.
export async function sincronizar(): Promise<{ ultima_atualizacao: string | null }> {
  return pedirApi<{ ultima_atualizacao: string | null }>('/api/sincronizar/', 'POST');
}

// Todas as dívidas, na ordem da API (mais recente primeiro)
export async function buscarDividas(): Promise<Divida[]> {
  return pedirApi<Divida[]>('/api/dividas/');
}

// Cadastra uma dívida; o backend gera as parcelas e devolve a dívida pronta
export async function criarDivida(nova: NovaDivida): Promise<Divida> {
  return pedirApi<Divida>('/api/dividas/', 'POST', nova);
}

// Edita a dívida; todos os campos são opcionais e só os enviados mudam. Se
// valor, parcelas ou mês mudarem, o backend gera as parcelas de novo (e recusa
// com 400 se alguma parcela já estiver paga). Devolve a dívida atualizada.
export async function editarDivida(id: number, dados: Partial<NovaDivida>): Promise<Divida> {
  return pedirApi<Divida>(`/api/dividas/${id}/`, 'PATCH', dados);
}

// Marca (true) ou desmarca (false) uma parcela como paga. O backend devolve a
// dívida inteira já atualizada.
export async function marcarParcela(id: number, paga: boolean): Promise<Divida> {
  return pedirApi<Divida>(`/api/parcelas/${id}/`, 'PATCH', { paga });
}

// Apaga a dívida e as parcelas dela. A resposta (204) não tem corpo.
export async function apagarDivida(id: number): Promise<void> {
  return pedirApi<void>(`/api/dividas/${id}/`, 'DELETE');
}

// Todos os gastos fixos, por nome, com a situação de cada um no mês atual
export async function buscarGastosFixos(): Promise<GastoFixo[]> {
  return pedirApi<GastoFixo[]>('/api/gastos-fixos/');
}

export async function criarGastoFixo(dados: DadosDoGastoFixo): Promise<GastoFixo> {
  return pedirApi<GastoFixo>('/api/gastos-fixos/', 'POST', dados);
}

export async function editarGastoFixo(id: number, dados: DadosDoGastoFixo): Promise<GastoFixo> {
  return pedirApi<GastoFixo>(`/api/gastos-fixos/${id}/`, 'PATCH', dados);
}

// Apaga o gasto fixo e as marcações de pago dele. A resposta (204) não tem corpo.
export async function apagarGastoFixo(id: number): Promise<void> {
  return pedirApi<void>(`/api/gastos-fixos/${id}/`, 'DELETE');
}

// Marca o gasto fixo como pago em um mês ("2026-10"); devolve o gasto atualizado
export async function marcarGastoFixoPago(id: number, mes: string): Promise<GastoFixo> {
  return pedirApi<GastoFixo>(`/api/gastos-fixos/${id}/pagamentos/${mes}/`, 'PUT');
}

// Desfaz a marcação de pago manual; devolve o gasto atualizado
export async function desmarcarGastoFixoPago(id: number, mes: string): Promise<GastoFixo> {
  return pedirApi<GastoFixo>(`/api/gastos-fixos/${id}/pagamentos/${mes}/`, 'DELETE');
}

export async function buscarPlano():Promise<PlanoDeGuardar> {
  return pedirApi<PlanoDeGuardar>('/api/plano/');
}

// Manda sempre os dois campos (PATCH): os dois null removem o plano.
// Se só um vier vazio, quem recusa é o backend (400 com a mensagem dele).
export async function salvarPlano(plano: PlanoDeGuardar): Promise<PlanoDeGuardar> {
  return pedirApi<PlanoDeGuardar>('/api/plano/', 'PATCH', plano);
}
