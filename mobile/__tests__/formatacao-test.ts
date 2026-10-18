// Testes das funções que deixam dinheiro e datas no formato brasileiro.
// Aqui não tem tela: chamamos a função direto e conferimos o texto que ela
// devolve. Por isso o arquivo é .ts (sem JSX) e não precisa de render.
import {
  formatarData,
  formatarMes,
  formatarReais,
  hojeNoCelular,
  lerMes,
  lerReais,
  nomeDoMes,
  textoDaAtualizacao,
} from '@/formatacao';

describe('formatarReais', () => {
  it('"1250.50" vira "R$ 1.250,50"', () => {
    // toBe compara o texto exato, letra por letra (como o == do Python)
    expect(formatarReais('1250.50')).toBe('R$ 1.250,50');
  });

  it('"1234567.89" vira "R$ 1.234.567,89" (um ponto a cada três dígitos)', () => {
    expect(formatarReais('1234567.89')).toBe('R$ 1.234.567,89');
  });

  it('valores abaixo de mil ficam sem ponto de milhar', () => {
    // Os dois lados do limite: zero e o maior valor antes de mil
    expect(formatarReais('0.00')).toBe('R$ 0,00');
    expect(formatarReais('999.99')).toBe('R$ 999,99');
  });

  it('"-45.90" vira "- R$ 45,90" (o sinal fica antes do R$)', () => {
    expect(formatarReais('-45.90')).toBe('- R$ 45,90');
  });
});

describe('formatarData', () => {
  it('"2026-10-08" vira "08/10" (e não "07/10")', () => {
    // O "e não 07/10" é a armadilha do fuso: new Date("2026-10-08") é
    // meia-noite em UTC, que no horário de Brasília ainda é dia 7.
    expect(formatarData('2026-10-08')).toBe('08/10');
  });
});

describe('nomeDoMes', () => {
  it('mês 10 de 2026 vira "Outubro de 2026"', () => {
    // O mês vai de 1 a 12 (diferente do Date do JavaScript, que vai de 0 a 11)
    expect(nomeDoMes(2026, 10)).toBe('Outubro de 2026');
  });
});

// lerReais faz o caminho contrário do formatarReais: lê o que a pessoa
// digitou no formato brasileiro e devolve o texto que o backend entende
// (ponto nos centavos, sempre duas casas).
describe('lerReais', () => {
  it('"1000" vira "1000.00"', () => {
    expect(lerReais('1000')).toBe('1000.00');
  });

  it('"1.000,50" vira "1000.50" (tira o ponto de milhar, a vírgula vira ponto)', () => {
    expect(lerReais('1.000,50')).toBe('1000.50');
  });

  it('"0,5" vira "0.50" (completa os centavos)', () => {
    expect(lerReais('0,5')).toBe('0.50');
  });

  it('campo vazio vira null (sem limite)', () => {
    // toBeNull confere que o resultado é exatamente null
    expect(lerReais('')).toBeNull();
  });

  it('"abc" é recusado com erro', () => {
    // Para conferir que uma função lança erro, passamos ao expect uma função
    // que chama a nossa (o "() =>"). Se chamássemos lerReais('abc') direto,
    // o erro estouraria antes de o expect conseguir olhar. toThrow com texto
    // confere também a mensagem do erro. É o pytest.raises do Jest.
    expect(() => lerReais('abc')).toThrow('Valor inválido');
  });
});

// lerMes faz com o mês o que o lerReais faz com o dinheiro: lê o que a pessoa
// digitou na folha "Plano de guardar" ("07/2027") e devolve o formato do
// backend ("2027-07"). Só aceita MM/AAAA: mês com dois dígitos, de 01 a 12, e
// ano com quatro.
describe('lerMes', () => {
  it('"07/2027" vira "2027-07"', () => {
    expect(lerMes('07/2027')).toBe('2027-07');
  });

  it('ignora espaços antes e depois (" 07/2027 " vira "2027-07")', () => {
    expect(lerMes(' 07/2027 ')).toBe('2027-07');
  });

  it('campo vazio vira null (sem plano)', () => {
    expect(lerMes('')).toBeNull();
  });

  it('"7/27" é recusado com erro (o caso 13 da tela)', () => {
    // Mesmo truque do lerReais: o "() =>" deixa o expect chamar a função e
    // pegar o erro, em vez de o erro estourar antes.
    expect(() => lerMes('7/27')).toThrow('Mês inválido');
  });

  it('mês fora de 01 a 12 é recusado', () => {
    // Os dois lados do limite: um acima de 12 e o zero.
    expect(() => lerMes('13/2027')).toThrow('Mês inválido');
    expect(() => lerMes('00/2027')).toThrow('Mês inválido');
  });

  it('"2027-07" (o formato do backend) é recusado', () => {
    // A pessoa digita no formato brasileiro; o formato do backend é só para
    // a conversa entre o app e o servidor.
    expect(() => lerMes('2027-07')).toThrow('Mês inválido');
  });
});

// formatarMes faz o caminho contrário do lerMes: pega o mês do backend e
// mostra no campo da folha, no formato que a pessoa digitaria.
describe('formatarMes', () => {
  it('"2027-07" vira "07/2027"', () => {
    expect(formatarMes('2027-07')).toBe('07/2027');
  });
});

// textoDaAtualizacao monta a linha "Atualizado ..." da tela Início (módulo
// 3b-2). Ela recebe duas coisas: quando o backend sincronizou pela última vez
// (o texto que vem da API, ou null) e o dia de hoje no celular ("AAAA-MM-DD").
// Como recebe o "hoje" pronto, em vez de olhar o relógio sozinha, é uma
// função pura: mesma entrada, mesma saída, em qualquer dia e em qualquer
// fuso. Por isso estes testes não precisam de relógio falso.
//
// As horas vêm do backend já no fuso dele (o "-03:00" no fim); a função só
// recorta a data (caracteres 0 a 10) e a hora (11 a 16), sem converter.
describe('textoDaAtualizacao', () => {
  it('no mesmo dia, mostra "Atualizado hoje às 14:32" (caso 3)', () => {
    expect(textoDaAtualizacao('2026-10-17T14:32:05.123456-03:00', '2026-10-17')).toBe(
      'Atualizado hoje às 14:32',
    );
  });

  it('no dia anterior, mostra "Atualizado ontem às 09:10" (caso 4)', () => {
    expect(textoDaAtualizacao('2026-10-16T09:10:00.000000-03:00', '2026-10-17')).toBe(
      'Atualizado ontem às 09:10',
    );
  });

  it('31/10 visto em 01/11 também é "ontem" (virada de mês, caso 4)', () => {
    // A armadilha: comparar só o número do dia (31 e 1) não diria "ontem".
    expect(textoDaAtualizacao('2026-10-31T09:10:00.000000-03:00', '2026-11-01')).toBe(
      'Atualizado ontem às 09:10',
    );
  });

  it('31/12 visto em 01/01 do ano seguinte também é "ontem" (virada de ano, caso 4)', () => {
    // Aqui mudam o dia, o mês e o ano ao mesmo tempo.
    expect(textoDaAtualizacao('2026-12-31T09:10:00.000000-03:00', '2027-01-01')).toBe(
      'Atualizado ontem às 09:10',
    );
  });

  it('antes de ontem, mostra a data: "Atualizado em 15/10 às 09:10" (caso 4)', () => {
    expect(textoDaAtualizacao('2026-10-15T09:10:00.000000-03:00', '2026-10-17')).toBe(
      'Atualizado em 15/10 às 09:10',
    );
  });

  it('sem atualização (null), mostra "Ainda não atualizado" (caso 5)', () => {
    expect(textoDaAtualizacao(null, '2026-10-17')).toBe('Ainda não atualizado');
  });
});

// hojeNoCelular é quem olha o relógio do celular e devolve o dia de hoje
// no formato "AAAA-MM-DD", para entregar ao textoDaAtualizacao.
describe('hojeNoCelular', () => {
  // Devolve o relógio de verdade depois de cada teste deste bloco, mesmo se
  // o teste falhar no meio (por isso no afterEach, e não no fim do teste).
  afterEach(() => {
    jest.useRealTimers();
  });

  it('com o relógio em 05/03/2026 ao meio-dia, devolve "2026-03-05"', () => {
    // Relógio falso: o "now" diz ao Jest que agora é 05/03/2026 ao
    // meio-dia, no fuso do computador que roda o teste (new Date com ano,
    // mês, dia e hora usa esse fuso; o mês começa em 0, então 2 é março).
    // Meio-dia fica longe da meia-noite, então nenhum fuso muda o dia.
    jest.useFakeTimers({ now: new Date(2026, 2, 5, 12, 0, 0) });

    // Escolhemos março e dia 5 de propósito: mês e dia de um dígito só
    // precisam ganhar o zero na frente ("03", "05"), como as datas da API.
    // Também confere que o mês não sai como "02" (o Date conta de 0 a 11).
    expect(hojeNoCelular()).toBe('2026-03-05');
  });
});
