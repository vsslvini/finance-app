from datetime import date

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from financas.services.periodo import mes_atual
from planejamento.models import Configuracao, PlanoDeGuardar
from planejamento.serializers import ConfiguracaoSerializer, PlanoDeGuardarSerializer


@api_view(["GET", "PATCH"])
def configuracoes(request):
    configuracao = Configuracao.atual()
    if request.method == "GET":
        return Response(ConfiguracaoSerializer(configuracao).data)

    # partial=True: o PATCH pode mandar só um dos campos; o outro fica como está
    serializer = ConfiguracaoSerializer(configuracao, data=request.data, partial=True)
    # Dado inválido: o DRF responde 400 com as mensagens de cada campo
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET", "PATCH"])
def plano(request):
    plano_de_guardar = PlanoDeGuardar.atual()
    if request.method == "GET":
        return Response(PlanoDeGuardarSerializer(plano_de_guardar).data)

    # "Mês atual" é o mês do app, o mesmo do resumo (pode já ser o próximo
    # quando o mês começa dias antes); o serializer recusa mês alvo antes dele
    ano, mes = mes_atual(timezone.localdate(), Configuracao.atual().dias_antes_do_mes)
    serializer = PlanoDeGuardarSerializer(
        plano_de_guardar,
        data=request.data,
        partial=True,
        context={"mes_atual": date(ano, mes, 1)},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
