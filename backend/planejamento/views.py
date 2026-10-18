from datetime import date

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from financas.services.periodo import mes_atual
from planejamento.models import Configuracao, Divida, ParcelaDaDivida, PlanoDeGuardar
from planejamento.serializers import (
    ConfiguracaoSerializer,
    DividaSerializer,
    EditarDividaSerializer,
    MarcarParcelaSerializer,
    NovaDividaSerializer,
    PlanoDeGuardarSerializer,
)


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


def dia_1_do_mes_atual():
    # O mês atual do app (dia 1), o mesmo do resumo; decide o "atrasada"
    ano, mes = mes_atual(timezone.localdate(), Configuracao.atual().dias_antes_do_mes)
    return date(ano, mes, 1)


def resposta_da_divida(divida, codigo=status.HTTP_200_OK):
    # Todas as rotas de dívidas respondem a dívida no mesmo formato da lista
    contexto = {"mes_atual": dia_1_do_mes_atual()}
    return Response(DividaSerializer(divida, context=contexto).data, status=codigo)


@api_view(["GET", "POST"])
def dividas(request):
    if request.method == "GET":
        # prefetch_related: busca as parcelas de todas as dívidas numa consulta
        # só, em vez de uma por dívida. "-id" desempata as criadas no mesmo
        # instante
        lista = Divida.objects.prefetch_related("parcelas").order_by(
            "-criada_em", "-id"
        )
        contexto = {"mes_atual": dia_1_do_mes_atual()}
        return Response(DividaSerializer(lista, many=True, context=contexto).data)

    entrada = NovaDividaSerializer(data=request.data)
    # Dado inválido: 400 com a mensagem de cada campo, e nada é salvo
    entrada.is_valid(raise_exception=True)
    # save() chama o create() do serializer, que chama o service
    nova = entrada.save()
    return resposta_da_divida(nova, status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
def divida(request, pk):
    # get_object_or_404: id que não existe vira resposta 404
    escolhida = get_object_or_404(Divida, pk=pk)
    if request.method == "DELETE":
        # CASCADE no model: as parcelas vão junto
        escolhida.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # partial=True: pode mandar só o credor ou só o motivo
    entrada = EditarDividaSerializer(escolhida, data=request.data, partial=True)
    entrada.is_valid(raise_exception=True)
    entrada.save()
    return resposta_da_divida(escolhida)


@api_view(["PATCH"])
def parcela(request, pk):
    escolhida = get_object_or_404(ParcelaDaDivida, pk=pk)
    entrada = MarcarParcelaSerializer(data=request.data)
    entrada.is_valid(raise_exception=True)
    escolhida.paga = entrada.validated_data["paga"]
    # Guarda o dia em que foi marcada; desmarcar limpa
    escolhida.paga_em = timezone.localdate() if escolhida.paga else None
    escolhida.save()
    # Responde a dívida inteira, para o app atualizar o pago e o restante
    return resposta_da_divida(escolhida.divida)
