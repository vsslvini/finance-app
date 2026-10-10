// Ícone de cada gasto: uma sigla de 2 letras com as cores da categoria.
// As categorias vêm da Pluggy em inglês; comparamos pelo nome exato.
import { coresDeCategoria } from '@/tema';

export type IconeDeCategoria = {
  sigla: 'ME' | 'RE' | 'TR' | 'OU';
  fundo: string;
  letra: string;
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

// "Groceries" -> { sigla: 'ME', ... }; qualquer outra (até "Sem categoria") -> 'OU'
export function iconeDaCategoria(categoria: string): IconeDeCategoria {
  if (MERCADO.includes(categoria)) {
    return { sigla: 'ME', ...coresDeCategoria.mercado };
  }
  if (RESTAURANTES.includes(categoria)) {
    return { sigla: 'RE', ...coresDeCategoria.restaurantes };
  }
  if (TRANSPORTE.includes(categoria)) {
    return { sigla: 'TR', ...coresDeCategoria.transporte };
  }
  return { sigla: 'OU', ...coresDeCategoria.outras };
}
