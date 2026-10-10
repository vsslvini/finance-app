// Testes da função que escolhe o ícone de cada gasto pela categoria que vem
// da Pluggy (em inglês). Como no formatacao-test.ts, não tem tela: chamamos
// a função direto. Conferimos só a sigla (as duas letras dentro do círculo);
// as cores vêm do tema e não são regra de negócio.
import { iconeDaCategoria } from '@/categorias';

describe('iconeDaCategoria', () => {
  it('"Groceries" vira mercado (ME)', () => {
    // .sigla pega só o campo sigla do objeto { sigla, fundo, letra }
    expect(iconeDaCategoria('Groceries').sigla).toBe('ME');
  });

  it('"Food delivery" vira restaurante (RE)', () => {
    expect(iconeDaCategoria('Food delivery').sigla).toBe('RE');
  });

  it('"Gas stations" vira transporte (TR)', () => {
    expect(iconeDaCategoria('Gas stations').sigla).toBe('TR');
  });

  it('"Sem categoria" vira outros (OU)', () => {
    expect(iconeDaCategoria('Sem categoria').sigla).toBe('OU');
  });

  it('uma categoria desconhecida vira outros (OU)', () => {
    // Um nome inventado, que com certeza não está no mapa de categorias
    expect(iconeDaCategoria('Categoria inventada').sigla).toBe('OU');
  });
});
