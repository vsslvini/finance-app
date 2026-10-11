// Testes da função que escolhe o ícone de cada gasto pela categoria que vem
// da Pluggy (em inglês). Como no formatacao-test.ts, não tem tela: chamamos
// a função direto. Conferimos só o nome do ícone (o desenho do pacote Lucide
// que aparece dentro do círculo); as cores vêm do tema e não são regra de
// negócio.
import { iconeDaCategoria } from '@/categorias';

describe('iconeDaCategoria', () => {
  it('"Groceries" vira o carrinho de mercado (shopping-cart)', () => {
    // .icone pega só o campo icone do objeto { icone, fundo, cor }
    expect(iconeDaCategoria('Groceries').icone).toBe('shopping-cart');
  });

  it('"Food delivery" vira os talheres (utensils)', () => {
    expect(iconeDaCategoria('Food delivery').icone).toBe('utensils');
  });

  it('"Gas stations" vira o carro (car)', () => {
    expect(iconeDaCategoria('Gas stations').icone).toBe('car');
  });

  it('"Sem categoria" vira os três pontinhos (ellipsis)', () => {
    expect(iconeDaCategoria('Sem categoria').icone).toBe('ellipsis');
  });

  it('uma categoria desconhecida vira os três pontinhos (ellipsis)', () => {
    // Um nome inventado, que com certeza não está no mapa de categorias
    expect(iconeDaCategoria('Categoria inventada').icone).toBe('ellipsis');
  });
});
