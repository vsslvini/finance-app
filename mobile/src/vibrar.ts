// Vibração leve (expo-haptics) para dar sensação "física" ao toque. Estas
// funções nunca lançam erro: na web não há vibração, nos testes o módulo é
// simulado e alguns aparelhos nem têm o motor de vibração. Nesses casos,
// simplesmente não acontece nada. Nenhuma tela precisa se preocupar com isso.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Roda a vibração sem deixar escapar erro, nem síncrono (try/catch) nem de
// promessa recusada (.catch). Promise.resolve cobre o caso de o módulo
// simulado devolver undefined em vez de uma promessa.
function tentar(acao: () => Promise<void>) {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    Promise.resolve(acao()).catch(() => {});
  } catch {
    // sem vibração neste aparelho: tudo bem
  }
}

// Troca de aba e escolha numa lista: o "tique" mais leve que existe
export function vibrarSelecao() {
  tentar(() => Haptics.selectionAsync());
}

// Toque em botão principal
export function vibrarToque() {
  tentar(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

// Ação concluída (ex.: marcar como pago)
export function vibrarSucesso() {
  tentar(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
