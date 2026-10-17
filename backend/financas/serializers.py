from rest_framework import serializers

from financas.models import Conta, Transacao
from planejamento.serializers import PlanoDeGuardarSerializer


class ContaSerializer(serializers.ModelSerializer):
    # source: pega o valor seguindo a ligação conta -> conexão
    nome_banco = serializers.CharField(source="conexao.nome_banco", read_only=True)

    class Meta:
        model = Conta
        # Lista fechada: id_pluggy é interno do backend e fica de fora
        fields = (
            "id",
            "nome",
            "nome_banco",
            "tipo",
            "saldo",
            "limite_total",
            "limite_disponivel",
            "data_fechamento",
            "data_vencimento",
        )


class TransacaoSerializer(serializers.ModelSerializer):
    nome_conta = serializers.CharField(source="conta.nome", read_only=True)
    nome_banco = serializers.CharField(
        source="conta.conexao.nome_banco", read_only=True
    )
    # Uma categoria só para o app: manual, senão a da Pluggy, senão "Sem categoria"
    categoria = serializers.CharField(source="categoria_exibida", read_only=True)

    class Meta:
        model = Transacao
        # "conta" sai como o id da conta (o ModelSerializer faz isso sozinho)
        fields = (
            "id",
            "data",
            "descricao",
            "valor",
            "conta",
            "nome_conta",
            "nome_banco",
            "categoria",
            "parcela_atual",
            "total_parcelas",
        )


class GuardadoSerializer(serializers.Serializer):
    # O bloco "guardado" do resumo, também um dict
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    este_mes = serializers.DecimalField(max_digits=12, decimal_places=2)
    # O mesmo serializer de /api/plano/, para o mês sair igual ("2027-07");
    # None (null no JSON) quando não há plano
    plano = PlanoDeGuardarSerializer(allow_null=True)
    # Os dois None quando não há plano
    previsto = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )
    progresso = serializers.IntegerField(allow_null=True)
    falta_guardar_no_mes = serializers.DecimalField(max_digits=12, decimal_places=2)


class ResumoSerializer(serializers.Serializer):
    # Serializer comum (não ModelSerializer): o resumo é um dict, não um model.
    # Sem ele, o Response transformaria Decimal em float (ex.: 1000.0); o
    # DecimalField devolve texto ("1000.00"), igual às outras rotas
    mes = serializers.CharField()
    # None quando o mês pedido não é o mês de hoje
    dia_do_mes = serializers.IntegerField(allow_null=True)
    dias_no_mes = serializers.IntegerField(allow_null=True)
    saldo_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    fatura_aberta = serializers.DecimalField(max_digits=12, decimal_places=2)
    entradas = serializers.DecimalField(max_digits=12, decimal_places=2)
    saidas = serializers.DecimalField(max_digits=12, decimal_places=2)
    # None quando o mês pedido não é o mês de hoje
    posso_gastar_por_dia = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )
    ultimos_gastos = TransacaoSerializer(many=True)
    # None quando não há limite definido na configuração
    limite_fatura = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )
    fatura_acima_do_limite = serializers.BooleanField()
    guardado = GuardadoSerializer()
