// Teste de fumaça do Reanimated: confere que um componente animado monta no
// Jest e que o conteúdo continua achável (animação não pode esconder texto).
// Se a configuração do Reanimated no Jest quebrar, este é o primeiro a falhar.
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

describe('Reanimated no Jest', () => {
  it('um bloco com animação de entrada mostra o conteúdo', async () => {
    await render(
      <Animated.View entering={FadeInDown.duration(200)}>
        <Text>Conteúdo animado</Text>
      </Animated.View>,
    );

    expect(screen.getByText('Conteúdo animado')).toBeOnTheScreen();
  });
});
