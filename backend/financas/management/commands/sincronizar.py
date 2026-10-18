import requests
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Max
from django.utils import timezone

from financas.models import Conexao

# Importa o módulo (e não a função) para os testes conseguirem trocá-la
from financas.services import sincronizacao

PLUGGY_FORA = "Não foi possível falar com a Pluggy."
SEM_CONEXOES = "Nenhuma conexão cadastrada."


class Command(BaseCommand):
    help = "Copia os dados da Pluggy para o banco (o mesmo que puxar a tela Início)."

    def handle(self, *args, **options):
        total = Conexao.objects.count()
        if total == 0:
            # Sem conexão não há o que buscar; não é erro, então sai com código 0
            self.stdout.write(SEM_CONEXOES)
            return

        try:
            sincronizacao.sincronizar()
        except requests.RequestException as erro:
            # Rodando pelo terminal (ou pelo systemd), o Django escreve a mensagem
            # no erro padrão e sai com código 1. O motivo entre parênteses ajuda a
            # entender a falha no journalctl
            raise CommandError(f"{PLUGGY_FORA} ({erro})") from erro

        ultima = Conexao.objects.aggregate(ultima=Max("ultima_atualizacao"))["ultima"]
        # localtime: mostra no fuso do settings (TIME_ZONE), não em UTC
        quando = timezone.localtime(ultima).strftime("%Y-%m-%d %H:%M")
        self.stdout.write(f"Sincronizado: {total} conexões, {quando}")
