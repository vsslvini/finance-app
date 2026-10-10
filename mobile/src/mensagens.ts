// Mensagens de erro da API, usadas pela tela Início e pela folha de edição.
import type { TipoErroApi } from '@/api';

export const MENSAGENS_DE_ERRO: Record<TipoErroApi, string> = {
  conexao:
    'Não foi possível conectar ao servidor. Confira se o backend está rodando e se o celular está na mesma rede.',
  token: 'Acesso negado pelo servidor. Confira o token no arquivo .env do app.',
  servidor: 'O servidor teve um erro. Tente de novo em instantes.',
  // Reserva: no 'validacao', a folha mostra a mensagem que o backend mandou
  validacao: 'O servidor não aceitou o valor. Confira e tente de novo.',
};
