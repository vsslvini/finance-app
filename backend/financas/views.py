from datetime import date

import requests
from django.db.models import Max
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from financas.models import Conexao, Conta, Transacao
from financas.serializers import ContaSerializer, ResumoSerializer, TransacaoSerializer

# Importa o módulo (e não a função) para os testes conseguirem trocá-la
from financas.services import sincronizacao
from financas.services.periodo import mes_atual, periodo_do_mes
from financas.services.resumo import resumo_do_mes
from planejamento.models import Configuracao

MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-10."
PLUGGY_FORA = "Não foi possível falar com a Pluggy. Tente de novo mais tarde."


class ContasView(generics.ListAPIView):
    serializer_class = ContaSerializer
    # select_related: traz a conexão no mesmo SELECT, em vez de uma consulta
    # a mais por conta só para ler o nome do banco
    queryset = Conta.objects.select_related("conexao").order_by(
        "conexao__nome_banco", "nome"
    )


def ler_mes(texto, hoje, dias_antes):
    # Devolve o dia 1 do mês pedido. Sem ?mes=, usa o mês do app que contém
    # hoje, que pode já ser o próximo quando o mês começa dias antes (RF30)
    if texto is None:
        ano, mes = mes_atual(hoje, dias_antes)
        return date(ano, mes, 1)
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
        dias_antes = Configuracao.atual().dias_antes_do_mes
        texto = self.request.query_params.get("mes")
        # timezone.localdate(): a data de hoje no fuso do settings (TIME_ZONE)
        mes = ler_mes(texto, timezone.localdate(), dias_antes)
        inicio, fim = periodo_do_mes(mes.year, mes.month, dias_antes)
        # select_related: conta e banco no mesmo SELECT, sem uma consulta por linha.
        # "-id" desempata transações do mesmo dia: a criada por último vem antes
        return (
            Transacao.objects.select_related("conta__conexao")
            .filter(data__range=(inicio, fim))
            .order_by("-data", "-id")
        )


@api_view(["GET"])
def resumo(request):
    # A view lê a configuração e entrega ao service só os números que ele usa
    configuracao = Configuracao.atual()
    dias_antes = configuracao.dias_antes_do_mes
    hoje = timezone.localdate()
    mes = ler_mes(request.query_params.get("mes"), hoje, dias_antes)
    dados = resumo_do_mes(mes, hoje, dias_antes, configuracao.limite_fatura)
    return Response(ResumoSerializer(dados).data)


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
