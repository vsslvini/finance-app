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

// Resposta de GET /api/resumo/ (mesmos campos do ResumoSerializer)
export type Resumo = {
  saldo_total: string;
  fatura_aberta: string;
  entradas: string;
  saidas: string;
  posso_gastar_por_dia: string | null; // null quando não é o mês de hoje
  ultimos_gastos: GastoResumo[];
};

// Tempo máximo de espera pela resposta do servidor (15 segundos)
export const LIMITE_DE_TEMPO_MS = 15000;

export type TipoErroApi = 'conexao' | 'token' | 'servidor';

// Erro com um "tipo", para a tela escolher a mensagem certa
export class ErroApi extends Error {
  tipo: TipoErroApi;

  constructor(tipo: TipoErroApi) {
    super(`Erro na API: ${tipo}`);
    this.name = 'ErroApi';
    this.tipo = tipo;
    // Garante que "erro instanceof ErroApi" funcione mesmo se o código for
    // transformado para uma versão antiga de JavaScript
    Object.setPrototypeOf(this, ErroApi.prototype);
  }
}

export async function buscarResumo(): Promise<Resumo> {
  // Lidas aqui dentro (a cada chamada) para os testes poderem trocar os valores.
  // Sempre com ponto: o Expo só troca a forma process.env.EXPO_PUBLIC_X
  const url = process.env.EXPO_PUBLIC_API_URL;
  const token = process.env.EXPO_PUBLIC_API_TOKEN;

  // O AbortController cancela o fetch se passar do limite de tempo
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITE_DE_TEMPO_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`${url}/api/resumo/`, {
        headers: { Authorization: `Token ${token}` },
        signal: controller.signal,
      });
    } catch {
      // Sem rede, servidor desligado ou tempo esgotado (abort)
      throw new ErroApi('conexao');
    }

    if (response.status === 401) {
      throw new ErroApi('token');
    }
    if (!response.ok) {
      throw new ErroApi('servidor');
    }
    return (await response.json()) as Resumo;
  } finally {
    // Sempre desliga o timer, deu certo ou não
    clearTimeout(timer);
  }
}
