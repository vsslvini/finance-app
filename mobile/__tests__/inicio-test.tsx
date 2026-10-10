// render desenha um componente num "celular de mentira" dentro do Jest;
// screen é a "tela" desse celular, onde procuramos o que o usuário veria.
import { render, screen } from '@testing-library/react-native';

// A tela de verdade, importada pelo atalho @/ (que aponta para src/).
import InicioScreen from '@/app/index';

describe('Tela inicial', () => {
  it('abre mostrando o texto "Início"', async () => {
    // Prepara: desenha a tela. Na versão 14 da biblioteca o render é
    // assíncrono, por isso o await (esperamos a tela terminar de desenhar).
    await render(<InicioScreen />);

    // Verifica: procura o texto exato "Início". O getByText falha sozinho se
    // não achar o texto ou se achar mais de um; o toBeOnTheScreen confirma
    // que ele está na tela.
    expect(screen.getByText('Início')).toBeOnTheScreen();
  });
});
