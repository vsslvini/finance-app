from rest_framework import serializers

from financas.models import Categoria, Conta, Transacao
from planejamento.serializers import PlanoDeGuardarSerializer

CATEGORIA_DESCONHECIDA = "Categoria desconhecida."


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
    # SerializerMethodField: o valor vem do método get_<nome do campo>
    # "categoria" é o texto para mostrar, em português quando há tradução
    categoria = serializers.SerializerMethodField()
    # "categoria_original" é o nome em inglês (o app escolhe o ícone por ele)
    categoria_original = serializers.SerializerMethodField()

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
            "categoria_original",
            "parcela_atual",
            "total_parcelas",
        )

    def get_categoria(self, transacao):
        # Manual, senão a da Pluggy, senão "Sem categoria", traduzida pelo
        # dicionário que a view mandou no context; sem tradução, fica como está
        exibida = transacao.categoria_exibida
        return self.context.get("traducoes", {}).get(exibida, exibida)

    def get_categoria_original(self, transacao):
        return transacao.categoria_manual or transacao.categoria_pluggy


class CategoriaManualSerializer(serializers.ModelSerializer):
    # Só a entrada do PATCH; a resposta usa o TransacaoSerializer.
    # Declarado aqui para ser obrigatório (o padrão de um campo declarado): sem
    # ele, um PATCH com o campo errado daria 200 sem mudar nada. "" continua
    # aceito (volta para a categoria da Pluggy)
    categoria_manual = serializers.CharField(max_length=100, allow_blank=True)

    class Meta:
        model = Transacao
        fields = ("categoria_manual",)

    def validate_categoria_manual(self, valor):
        if valor and not Categoria.objects.filter(descricao=valor).exists():
            raise serializers.ValidationError(CATEGORIA_DESCONHECIDA)
        return valor


class CategoriaSerializer(serializers.ModelSerializer):
    # "nome" não é campo do model: vem pronto da view (annotate)
    nome = serializers.CharField(read_only=True)

    class Meta:
        model = Categoria
        fields = ("descricao", "nome")


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
    # O DRF passa o context deste serializer aos de dentro, então as traduções
    # que a view manda chegam aqui sem mais nada
    ultimos_gastos = TransacaoSerializer(many=True)
    # None quando não há limite definido na configuração
    limite_fatura = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )
    fatura_acima_do_limite = serializers.BooleanField()
    guardado = GuardadoSerializer()
    # Sai no fuso do projeto (TIME_ZONE), ex.: "2026-10-17T14:32:05-04:00", então o
    # app só recorta o texto, sem converter fuso; null se nunca sincronizou
    ultima_atualizacao = serializers.DateTimeField(allow_null=True)


class CategoriaDoMesSerializer(serializers.Serializer):
    # Uma linha dos gastos por categoria do relatório (um dict, como o resumo)
    categoria = serializers.CharField()
    # "" quando o gasto não tem categoria (igual à lista de transações)
    categoria_original = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    porcentagem = serializers.IntegerField()


class RelatorioSerializer(serializers.Serializer):
    # Como o ResumoSerializer: o DecimalField devolve o dinheiro como texto
    mes = serializers.CharField()
    entradas = serializers.DecimalField(max_digits=12, decimal_places=2)
    saidas = serializers.DecimalField(max_digits=12, decimal_places=2)
    saldo_do_mes = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_gastos = serializers.DecimalField(max_digits=12, decimal_places=2)
    gastos_por_categoria = CategoriaDoMesSerializer(many=True)
    # As traduções que a view manda no context chegam aqui, como no resumo
    maiores_gastos = TransacaoSerializer(many=True)


class CartaoFuturoSerializer(serializers.Serializer):
    # Um cartão dentro de um mês das faturas futuras (um dict, como o resumo)
    conta = serializers.IntegerField()
    nome_banco = serializers.CharField()
    nome_conta = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)


class MesFuturoSerializer(serializers.Serializer):
    mes = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    cartoes = CartaoFuturoSerializer(many=True)


class FaturasFuturasSerializer(serializers.Serializer):
    # O DecimalField devolve o dinheiro como texto ("245.30"), igual ao resumo
    meses = MesFuturoSerializer(many=True)
