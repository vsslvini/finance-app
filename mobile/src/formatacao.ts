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

// "2026-10" -> "Outubro de 2026" (o mês vem do backend, não do relógio do celular).
// Usado no título da tela Início e no texto do plano de guardar.
export function tituloDoMes(mes: string): string {
  const ano = Number(mes.slice(0, 4));
  const numeroDoMes = Number(mes.slice(5, 7));
  return nomeDoMes(ano, numeroDoMes);
}

// Texto para o leitor de tela, que lê "1.250,50 reais" melhor do que "R$ 1.250,50".
// "Saldo: 1.250,50 reais" ou "Posso gastar por dia: menos 10,00 reais"
export function rotuloEmReais(nome: string, valor: string): string {
  const menos = valor.startsWith('-') ? 'menos ' : '';
  return `${nome}: ${menos}${formatarNumero(valor)} reais`;
}

// "2027-07" (formato da API) -> "07/2027" (formato do campo "Até quando")
export function formatarMes(mes: string): string {
  return `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
}

// Formato aceito no campo "Até quando": 2 dígitos do mês, barra, 4 dígitos do ano
const FORMATO_DE_MES = /^(\d{2})\/(\d{4})$/;

// Texto digitado -> texto que a API entende.
// "07/2027" -> "2027-07"; "" -> null (sem plano).
// Lança Error('Mês inválido') para qualquer outra coisa ("7/27", "13/2027", "2027-07").
// Assim como formatarData, trabalha só com o texto, sem usar Date.
export function lerMes(texto: string): string | null {
  // Tira todos os espaços, como o lerReais
  const limpo = texto.replace(/\s/g, '');
  if (limpo === '') {
    return null;
  }

  const partes = FORMATO_DE_MES.exec(limpo);
  if (partes === null) {
    throw new Error('Mês inválido');
  }

  // partes[1] é o mês ("07"); partes[2] é o ano ("2027").
  // A expressão só confere os dígitos; aqui conferimos se o mês existe.
  const mes = partes[1];
  const ano = partes[2];
  const numeroDoMes = Number(mes);
  if (numeroDoMes < 1 || numeroDoMes > 12) {
    throw new Error('Mês inválido');
  }
  return `${ano}-${mes}`;
}

// Formato aceito: dígitos (com pontos de milhar opcionais, de 3 em 3) e,
// se houver, vírgula com 1 ou 2 casas. Ex.: "1000", "1.000", "1.000,50", "0,5"
const FORMATO_DE_REAIS = /^(\d{1,3}(\.\d{3})+|\d+)(,(\d{1,2}))?$/;

// Texto digitado em pt-BR -> texto que a API entende.
// "1.000,50" -> "1000.50"; "R$ 1000" -> "1000.00"; "" -> null (sem limite).
// Lança Error('Valor inválido') para qualquer outra coisa ("abc", "10,505").
// Assim como formatarNumero, trabalha só com o texto, sem converter para Number.
export function lerReais(texto: string): string | null {
  // Tira todos os espaços e um "R$" opcional no começo
  const limpo = texto.replace(/\s/g, '').replace(/^R\$/, '');
  if (limpo === '') {
    return null;
  }

  const partes = FORMATO_DE_REAIS.exec(limpo);
  if (partes === null) {
    throw new Error('Valor inválido');
  }

  // partes[1] é a parte inteira ("1.000"); partes[4] são os centavos ("5")
  const inteiro = partes[1].replace(/\./g, '');
  const centavos = (partes[4] ?? '').padEnd(2, '0');
  return `${inteiro}.${centavos}`;
}
