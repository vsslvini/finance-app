// Tokens visuais do app, copiados do guia de design (docs/design.md).
// As telas usam só estes nomes; nenhuma cor ou medida solta no código das telas.
import { StyleSheet } from 'react-native';

// Seção 4 do guia: cores (mesmos nomes dos tokens)
export const cores = {
  // Base
  fundo: '#0F1214',
  superficie: '#181C1F',
  superficieElevada: '#20252A',
  borda: '#262C31',
  texto: '#ECEFF1',
  textoSecundario: '#A3ABB2',
  textoTerciario: '#8B949B',
  acento: '#A78BFA',
  textoSobreAcento: '#0F1214',
  // Significado
  // Mesmo roxo do acento (2026-10-17): entrada e saída se diferenciam pelo
  // "+" e "-" e pelo vermelho das saídas
  positivo: '#A78BFA',
  negativo: '#F2796F',
  aviso: '#F2B84B',
  avisoFundo: '#1E1A10',
  avisoBorda: '#6B4F1D',
  erro: '#F2796F',
  // Régua de dias do mês
  diaPassado: '#5B4AA8',
  diaHoje: '#A78BFA',
  diaFuturo: '#2A3036',
};

// Fundo escurecido atrás da folha de edição. Não está no guia (é preciso
// transparência, e o guia só usa #RRGGBB); ver o relatório do módulo.
export const fundoEscurecido = 'rgba(0, 0, 0, 0.6)';

// Tabela de categorias do guia: fundo e letra do ícone de cada uma
export const coresDeCategoria = {
  mercado: { fundo: '#2E2810', letra: '#F2D26B' },
  restaurantes: { fundo: '#33200F', letra: '#F5A56B' },
  transporte: { fundo: '#12263A', letra: '#6DB6F2' },
  outras: { fundo: '#20252A', letra: '#A3ABB2' },
};

// Nomes das fontes carregadas no _layout.tsx com useFonts.
// Com fonte própria, o peso vem do nome da família (não use fontWeight).
export const fontes = {
  regular: 'Manrope_400Regular',
  medio: 'Manrope_500Medium',
  seminegrito: 'Manrope_600SemiBold',
  negrito: 'Manrope_700Bold',
  extranegrito: 'Manrope_800ExtraBold',
};

// Seção 6 do guia: escala de espaçamento (4, 8, 12, 16, 24, 32)
export const espaco = {
  minimo: 4,
  pequeno: 8,
  medio: 12,
  grande: 16,
  maior: 24,
  maximo: 32,
};

// Seção 6 do guia: cantos arredondados
export const cantos = {
  cartao: 16,
  botao: 24,
  icone: 15,
  aviso: 12,
  campo: 12,
  folha: 20,
};

// Seção 10 do guia: resposta ao toque, num lugar só. A troca é imediata (sem
// animação), e as telas aplicam o estilo quando o Pressable está "pressed".
export const toque = StyleSheet.create({
  // Cartões tocáveis e o Botao: opacidade 0,85 e escala 0,98
  apertado: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  // Botões de ícone (setas, Voltar) e linhas dentro de listas: só opacidade 0,7
  apertadoIcone: {
    opacity: 0.7,
  },
});

// Seção 5 do guia: estilos de texto.
// "tabular-nums" deixa todos os dígitos com a mesma largura, para os valores
// em dinheiro não "pularem" quando mudam.
export const textos = StyleSheet.create({
  numeroDestaque: {
    fontFamily: fontes.extranegrito,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1,
    color: cores.texto,
    fontVariant: ['tabular-nums'],
  },
  titulo: {
    fontFamily: fontes.seminegrito,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    color: cores.textoSecundario,
    // Só o visual fica em maiúsculas; o texto continua "Outubro de 2026"
    textTransform: 'uppercase',
  },
  subtitulo: {
    fontFamily: fontes.negrito,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    color: cores.texto,
  },
  valor: {
    fontFamily: fontes.negrito,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
    color: cores.texto,
    fontVariant: ['tabular-nums'],
  },
  corpo: {
    fontFamily: fontes.medio,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0,
    color: cores.texto,
  },
  rotulo: {
    fontFamily: fontes.medio,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    color: cores.textoSecundario,
  },
  detalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    color: cores.textoTerciario,
  },
  botao: {
    fontFamily: fontes.negrito,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    color: cores.texto,
  },
});
