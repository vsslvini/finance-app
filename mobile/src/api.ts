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
  categoria: string;
  parcela_atual: number | null;
  total_parcelas: number | null;
};

// Uma transação da tela Transações. O backend usa o mesmo TransacaoSerializer
// nos "últimos gastos" do resumo e em /api/transacoes/, então o tipo é o mesmo.
export type Transacao = GastoResumo;

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
// (a sincronização com a Pluggy)
type Metodo = 'GET' | 'PATCH' | 'POST';

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
    // 400 só é "valor recusado" quando estamos salvando (PATCH). Num GET ou
    // POST, um 400 vem de configuração do servidor (ex.: ALLOWED_HOSTS) e cai
    // em 'servidor'
    if (response.status === 400 && metodo === 'PATCH') {
      throw new ErroApi('validacao', await primeiraMensagem(response));
    }
    // Aqui também caem o 500 e o 502 (a Pluggy falhou na sincronização)
    if (!response.ok) {
      throw new ErroApi('servidor');
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

// As transações de um mês do app ("2026-10"), da mais nova para a mais antiga.
// O backend já aplica o "mês começando dias antes", então o app só manda o mês.
export async function buscarTransacoes(mes: string): Promise<Transacao[]> {
  return pedirApi<Transacao[]>(`/api/transacoes/?mes=${mes}`);
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

export async function buscarPlano(): Promise<PlanoDeGuardar> {
  return pedirApi<PlanoDeGuardar>('/api/plano/');
}

// Manda sempre os dois campos (PATCH): os dois null removem o plano.
// Se só um vier vazio, quem recusa é o backend (400 com a mensagem dele).
export async function salvarPlano(plano: PlanoDeGuardar): Promise<PlanoDeGuardar> {
  return pedirApi<PlanoDeGuardar>('/api/plano/', 'PATCH', plano);
}
