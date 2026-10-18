from datetime import date

import requests
from django.db.models import Max, Value
from django.db.models.functions import Coalesce, NullIf
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from financas.models import Categoria, Conexao, Conta, Transacao
from financas.serializers import (
    CategoriaManualSerializer,
    CategoriaSerializer,
    ContaSerializer,
    FaturasFuturasSerializer,
    RelatorioSerializer,
    ResumoSerializer,
    TransacaoSerializer,
)

# Importa o módulo (e não a função) para os testes conseguirem trocá-la
from financas.services import sincronizacao
from financas.services.faturas_futuras import estimar_faturas
from financas.services.periodo import mes_atual, periodo_do_mes
from financas.services.relatorio import relatorio_do_mes
from financas.services.resumo import resumo_do_mes
from planejamento.models import Configuracao, PlanoDeGuardar

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

    def get_serializer_context(self):
        # As traduções são lidas uma vez por pedido e vão para o serializer
        # pelo context, em vez de uma consulta por transação
        contexto = super().get_serializer_context()
        contexto["traducoes"] = Categoria.traducoes()
        return contexto


@api_view(["PATCH"])
def trocar_categoria(request, pk):
    # get_object_or_404: id que não existe vira resposta 404
    transacao = get_object_or_404(
        Transacao.objects.select_related("conta__conexao"), pk=pk
    )
    entrada = CategoriaManualSerializer(transacao, data=request.data)
    # Categoria desconhecida: o DRF responde 400 com a mensagem do serializer
    entrada.is_valid(raise_exception=True)
    entrada.save()
    # A resposta sai no mesmo formato da lista de transações, já traduzida
    contexto = {"traducoes": Categoria.traducoes()}
    return Response(TransacaoSerializer(transacao, context=contexto).data)


class CategoriasView(generics.ListAPIView):
    serializer_class = CategoriaSerializer

    def get_queryset(self):
        # Categorias que são pai de outras (ex.: "Food and drinks") são grupos e
        # ficam de fora da escolha; as que não têm filhas (ex.: "Groceries") entram
        pais = Categoria.objects.exclude(id_pai="").values("id_pai")
        # nome = a tradução ou, se ela estiver vazia, o inglês. NullIf troca o ""
        # por NULL, e o Coalesce pega o primeiro valor que não é NULL. Ordenar no
        # banco também ordena certo os nomes com acento
        nome = Coalesce(NullIf("descricao_pt", Value("")), "descricao")
        return (
            Categoria.objects.exclude(id_pluggy__in=pais)
            .annotate(nome=nome)
            .order_by("nome")
        )


@api_view(["GET"])
def resumo(request):
    # A view lê a configuração e o plano de guardar e entrega ao service só os
    # números que ele usa
    configuracao = Configuracao.atual()
    plano = PlanoDeGuardar.atual()
    dias_antes = configuracao.dias_antes_do_mes
    hoje = timezone.localdate()
    mes = ler_mes(request.query_params.get("mes"), hoje, dias_antes)
    dados = resumo_do_mes(
        mes,
        hoje,
        dias_antes,
        configuracao.limite_fatura,
        valor_mensal=plano.valor_mensal,
        mes_alvo=plano.mes_alvo,
    )
    contexto = {"traducoes": Categoria.traducoes()}
    return Response(ResumoSerializer(dados, context=contexto).data)


@api_view(["GET"])
def relatorio(request):
    dias_antes = Configuracao.atual().dias_antes_do_mes
    mes = ler_mes(request.query_params.get("mes"), timezone.localdate(), dias_antes)
    # Lidas uma vez: o service traduz as categorias, e o serializer, os maiores
    # gastos
    traducoes = Categoria.traducoes()
    dados = relatorio_do_mes(mes, dias_antes, traducoes)
    contexto = {"traducoes": traducoes}
    return Response(RelatorioSerializer(dados, context=contexto).data)


@api_view(["GET"])
def faturas_futuras(request):
    # Como o resumo: a view lê os dias antes da configuração (o mês atual do
    # app depende deles) e o service faz a conta
    dias_antes = Configuracao.atual().dias_antes_do_mes
    dados = estimar_faturas(timezone.localdate(), dias_antes)
    return Response(FaturasFuturasSerializer(dados).data)


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
