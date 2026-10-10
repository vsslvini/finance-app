// Funções para mostrar dinheiro e datas no formato brasileiro.
// A API manda os valores como texto ("1250.50") e as datas como "2026-10-08".
// Trabalhamos direto com o texto, sem converter para Number, para não perder
// centavos com arredondamento de ponto flutuante.

const NOMES_DOS_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

// "1830.45" -> "1.830,45"; "-10.00" -> "10,00" (sem sinal e sem "R$ ")
export function formatarNumero(valor: string): string {
  // Tira o sinal, se houver; quem chama decide como mostrar o negativo
  const semSinal = valor.startsWith('-') ? valor.slice(1) : valor;

  // Separa a parte inteira dos centavos: "1830.45" -> ["1830", "45"]
  const [parteInteira, parteDecimal = ''] = semSinal.split('.');
  const inteiro = parteInteira === '' ? '0' : parteInteira;

  // Garante sempre 2 casas: "5" -> "50", "" -> "00"
  const centavos = parteDecimal.padEnd(2, '0').slice(0, 2);

  // Coloca um ponto a cada 3 dígitos, contando da direita: "1830" -> "1.830"
  const inteiroComPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${inteiroComPontos},${centavos}`;
}

// "1250.50" -> "R$ 1.250,50"; "-45.90" -> "- R$ 45,90"
export function formatarReais(valor: string): string {
  const negativo = valor.startsWith('-');
  const sinal = negativo ? '- ' : '';
  return `${sinal}R$ ${formatarNumero(valor)}`;
}

// "2026-10-08" -> "08/10"
// Cortamos o texto em vez de usar new Date("2026-10-08"): o JavaScript lê essa
// data como meia-noite em UTC, e no fuso de Brasília ela vira o dia anterior.
export function formatarData(iso: string): string {
  const mes = iso.slice(5, 7);
  const dia = iso.slice(8, 10);
  return `${dia}/${mes}`;
}

// (2026, 10) -> "Outubro de 2026"; o mês vai de 1 a 12
export function nomeDoMes(ano: number, mes: number): string {
  return `${NOMES_DOS_MESES[mes - 1]} de ${ano}`;
}
