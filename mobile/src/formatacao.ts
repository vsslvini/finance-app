// Funções para mostrar dinheiro, datas e horas no formato brasileiro.
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

// Soma valores no formato da API, em centavos inteiros (sem decimais do JavaScript).
// ["1200.00", "300.50"] -> "1500.50"; ["0.10", "0.20"] -> "0.30"; [] -> "0.00"
export function somarReais(valores: string[]): string {
  const totalEmCentavos = valores.reduce((soma, valor) => {
    const negativo = valor.startsWith('-');
    const [reais, centavosTexto = ''] = (negativo ? valor.slice(1) : valor).split('.');
    const centavos = Number(reais || '0') * 100 + Number(centavosTexto.padEnd(2, '0').slice(0, 2));
    return soma + (negativo ? -centavos : centavos);
  }, 0);

  const sinal = totalEmCentavos < 0 ? '-' : '';
  const absoluto = Math.abs(totalEmCentavos);
  const reais = Math.floor(absoluto / 100);
  return `${sinal}${reais}.${String(absoluto % 100).padStart(2, '0')}`;
}

// "2026-10-08" -> "08/10"
// Cortamos o texto em vez de usar new Date("2026-10-08"): o JavaScript lê essa
// data como meia-noite em UTC, e no fuso de Brasília ela vira o dia anterior.
export function formatarData(iso: string): string {
  const mes = iso.slice(5, 7);
  const dia = iso.slice(8, 10);
  return `${dia}/${mes}`;
}

// "2026-11-01" -> "2026-10-31": o dia anterior, no mesmo formato.
// Date.UTC aceita o dia 0 e o transforma no último dia do mês anterior (e do
// ano anterior, em janeiro). Usamos UTC na ida e na volta (toISOString), então
// o fuso do celular nunca entra na conta.
function diaAnterior(dia: string): string {
  const ano = Number(dia.slice(0, 4));
  const mes = Number(dia.slice(5, 7));
  const numeroDoDia = Number(dia.slice(8, 10));
  // No Date.UTC, janeiro é 0, por isso o "mes - 1"
  const ontem = new Date(Date.UTC(ano, mes - 1, numeroDoDia - 1));
  return ontem.toISOString().slice(0, 10);
}

// Texto da linha "Atualizado ..." da tela Início.
// "ultima" vem do backend já no fuso local ("2026-10-17T14:32:05.123456-04:00"),
// então só recortamos o texto: a data são os caracteres 0 a 10 e a hora, 11 a 16.
// "hoje" é a data do celular, "AAAA-MM-DD" (ver hojeNoCelular).
// null -> "Ainda não atualizado"; mesmo dia -> "Atualizado hoje às 14:32";
// dia anterior -> "Atualizado ontem às 09:10"; outro dia -> "Atualizado em 15/10 às 09:10"
export function textoDaAtualizacao(ultima: string | null, hoje: string): string {
  if (ultima === null) {
    return 'Ainda não atualizado';
  }
  const dia = ultima.slice(0, 10);
  const hora = ultima.slice(11, 16);
  if (dia === hoje) {
    return `Atualizado hoje às ${hora}`;
  }
  if (dia === diaAnterior(hoje)) {
    return `Atualizado ontem às ${hora}`;
  }
  return `Atualizado em ${formatarData(dia)} às ${hora}`;
}

// A data de hoje no relógio do celular, como "2026-10-17".
// Aqui usamos o horário local de propósito (getFullYear, getMonth, getDate):
// "hoje" é o dia que a pessoa vê no celular. O toISOString daria o dia em UTC,
// que à noite no Brasil já é o dia seguinte.
export function hojeNoCelular(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  // getMonth vai de 0 a 11, por isso o "+ 1"; o padStart põe o zero: 7 -> "07"
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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

// "2026-11" -> "novembro de 2026" (minúsculo, para ir no meio de uma frase)
export function mesPorExtenso(mes: string): string {
  return tituloDoMes(mes).toLowerCase();
}

// "2026-10" -> "outubro" (minúsculo e sem ano, para frases como "Falta pagar em outubro")
export function nomeCurtoDoMes(mes: string): string {
  return tituloDoMes(mes).split(' de ')[0].toLowerCase();
}

// O mês "passo" meses antes (negativo) ou depois (positivo), no formato da API.
// ("2026-10", -1) -> "2026-09"; ("2026-01", -1) -> "2025-12"; ("2026-12", 1) -> "2027-01".
// Só com texto e contas inteiras, sem Date, para o fuso do celular nunca entrar.
export function mesVizinho(mes: string, passo: number): string {
  const ano = Number(mes.slice(0, 4));
  const numeroDoMes = Number(mes.slice(5, 7));
  // Conta quantos meses se passaram desde o "mês zero" (janeiro do ano 0).
  // Assim a virada de ano sai sozinha da divisão por 12, sem if para dezembro
  // e janeiro. O "- 1" faz janeiro valer 0 e dezembro valer 11.
  const totalDeMeses = ano * 12 + (numeroDoMes - 1) + passo;
  const novoAno = Math.floor(totalDeMeses / 12);
  // O resto da divisão volta para 0 a 11; o "+ 1" devolve para 1 a 12
  const novoMes = (totalDeMeses % 12) + 1;
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`;
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
