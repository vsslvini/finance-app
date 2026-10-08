from datetime import date

import requests
from django.db.models import Max
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from financas.models import Conexao, Conta, Transacao
from financas.serializers import ContaSerializer, TransacaoSerializer

# Importa o módulo (e não a função) para os testes conseguirem trocá-la
from financas.services import sincronizacao

MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-10."
PLUGGY_FORA = "Não foi possível falar com a Pluggy. Tente de novo mais tarde."


class ContasView(generics.ListAPIView):
    serializer_class = ContaSerializer
    # select_related: traz a conexão no mesmo SELECT, em vez de uma consulta
    # a mais por conta só para ler o nome do banco
    queryset = Conta.objects.select_related("conexao").order_by(
        "conexao__nome_banco", "nome"
    )


def ler_mes(texto):
    # Sem ?mes=, usa o mês de hoje no fuso do settings (TIME_ZONE)
    if texto is None:
        return timezone.localdate()
    try:
        # "2026-10" vira ("2026", "10"); "abc" ou "2026-10-05" quebram aqui,
        # e date() recusa mês 13 ou 0. Tudo isso é ValueError
        ano, mes = texto.split("-")
        return date(int(ano), int(mes), 1)
    except ValueError:
        # O DRF transforma esta exceção numa resposta 400 com este JSON
        raise ValidationError({"detail": MES_INVALIDO})


class TransacoesView(generics.ListAPIView):
    serializer_class = TransacaoSerializer

    def get_queryset(self):
        mes = ler_mes(self.request.query_params.get("mes"))
        # select_related: conta e banco no mesmo SELECT, sem uma consulta por linha.
        # "-id" desempata transações do mesmo dia: a criada por último vem antes
        return (
            Transacao.objects.select_related("conta__conexao")
            .filter(data__year=mes.year, data__month=mes.month)
            .order_by("-data", "-id")
        )


@api_view(["POST"])
def sincronizar(request):
    try:
        sincronizacao.sincronizar()
    except requests.RequestException:
        # 502: o nosso backend está bem; quem falhou foi o serviço de fora
        return Response({"detail": PLUGGY_FORA}, status=status.HTTP_502_BAD_GATEWAY)

    # Max de uma tabela vazia (ou só com NULL) dá None, que vira null no JSON
    ultima = Conexao.objects.aggregate(ultima=Max("ultima_atualizacao"))["ultima"]
    return Response({"ultima_atualizacao": ultima})
