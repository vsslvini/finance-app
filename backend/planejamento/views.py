from rest_framework.decorators import api_view
from rest_framework.response import Response

from planejamento.models import Configuracao
from planejamento.serializers import ConfiguracaoSerializer


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
