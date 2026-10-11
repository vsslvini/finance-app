// Ícone de cada gasto: um ícone Lucide com as cores da categoria.
// As categorias vêm da Pluggy em inglês; comparamos pelo nome exato.
import { coresDeCategoria } from '@/tema';

// Nomes dos ícones Lucide usados nas categorias (conferidos no glyphmap do pacote)
export type NomeDoIconeDeCategoria = 'shopping-cart' | 'utensils' | 'car' | 'ellipsis';

export type IconeDeCategoria = {
  icone: NomeDoIconeDeCategoria;
  fundo: string;
  cor: string;
};

const MERCADO = ['Groceries'];

const RESTAURANTES = ['Food and drinks', 'Eating out', 'Food delivery'];

const TRANSPORTE = [
  'Transportation',
  'Taxi and ride-hailing',
  'Public transportation',
  'Car rental',
  'Bicycle',
  'Automotive',
  'Gas stations',
  'Parking',
  'Tolls and in-vehicle payment',
  'Vehicle ownership taxes and fees',
  'Vehicle maintenance',
  'Traffic tickets',
];

// Junta o nome do ícone com as cores do tema (a "letra" do guia vira "cor")
function montar(
  icone: NomeDoIconeDeCategoria,
  cores: { fundo: string; letra: string },
): IconeDeCategoria {
  return { icone, fundo: cores.fundo, cor: cores.letra };
}

// "Groceries" -> { icone: 'shopping-cart', ... }; qualquer outra (até "Sem categoria") -> 'ellipsis'
export function iconeDaCategoria(categoria: string): IconeDeCategoria {
  if (MERCADO.includes(categoria)) {
    return montar('shopping-cart', coresDeCategoria.mercado);
  }
  if (RESTAURANTES.includes(categoria)) {
    return montar('utensils', coresDeCategoria.restaurantes);
  }
  if (TRANSPORTE.includes(categoria)) {
    return montar('car', coresDeCategoria.transporte);
  }
  return montar('ellipsis', coresDeCategoria.outras);
}
