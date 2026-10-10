// Testes das funções que deixam dinheiro e datas no formato brasileiro.
// Aqui não tem tela: chamamos a função direto e conferimos o texto que ela
// devolve. Por isso o arquivo é .ts (sem JSX) e não precisa de render.
import { formatarData, formatarReais, nomeDoMes } from '@/formatacao';

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
