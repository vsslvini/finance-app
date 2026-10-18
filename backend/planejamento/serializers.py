from rest_framework import serializers

from planejamento.models import (
    Configuracao,
    Divida,
    GastoFixo,
    ParcelaDaDivida,
    PlanoDeGuardar,
)
from planejamento.services.dividas import (
    DividaComParcelaPaga,
    criar_divida,
    editar_divida,
)

DIAS_INVALIDOS = "Os dias antes do mês precisam ficar entre 0 e 10."
LIMITE_NEGATIVO = "O limite da fatura não pode ser negativo."
VALOR_NEGATIVO = "O valor por mês não pode ser negativo."
MES_ALVO_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2027-07."
MES_ALVO_NO_PASSADO = "O mês alvo não pode ser antes do mês atual."
PLANO_INCOMPLETO = "Preencha o valor por mês e o mês alvo, ou deixe os dois vazios."
SEM_CREDOR = "Informe para quem é a dívida."
VALOR_INVALIDO = "O valor precisa ser maior que zero."
PARCELAS_INVALIDAS = "As parcelas precisam ficar entre 1 e 120."
MES_INICIO_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-11."
COM_PARCELA_PAGA = "Com parcela paga, só dá para mudar para quem e o motivo."
SEM_NOME = "Informe o nome do gasto."
TRECHO_CURTO = "O trecho precisa ter pelo menos 3 letras."
DIA_INVALIDO = "O dia do vencimento precisa ficar entre 1 e 31."

# O mesmo texto para o campo que falta, que vem vazio ou só com espaços (o
# CharField do DRF tira os espaços das pontas antes de conferir)
ERROS_DO_CREDOR = {"required": SEM_CREDOR, "blank": SEM_CREDOR, "null": SEM_CREDOR}
ERROS_DO_NOME = {"required": SEM_NOME, "blank": SEM_NOME, "null": SEM_NOME}


class ConfiguracaoSerializer(serializers.ModelSerializer):
    # Campo declarado aqui (e não só no model) para trocar a mensagem padrão do
    # DRF pela nossa; os limites são os mesmos do model
    dias_antes_do_mes = serializers.IntegerField(
        min_value=0,
        max_value=10,
        error_messages={"min_value": DIAS_INVALIDOS, "max_value": DIAS_INVALIDOS},
    )

    class Meta:
        model = Configuracao
        # limite_fatura sai como texto ("1500.00") ou null, como o dinheiro do
        # resumo; o ModelSerializer já aceita null porque o model tem null=True
        fields = ("dias_antes_do_mes", "limite_fatura")

    def validate_limite_fatura(self, valor):
        # O DRF chama validate_<campo> depois de converter o texto em Decimal.
        # Também chega None (sem limite), que continua valendo
        if valor is not None and valor < 0:
            raise serializers.ValidationError(LIMITE_NEGATIVO)
        return valor


class PlanoDeGuardarSerializer(serializers.ModelSerializer):
    # No banco é uma data (dia 1); na API é só o mês, como texto "2027-07".
    # input_formats lê "2027-07" como 01/07/2027, e format escreve de volta
    mes_alvo = serializers.DateField(
        format="%Y-%m",
        input_formats=["%Y-%m"],
        allow_null=True,
        error_messages={"invalid": MES_ALVO_INVALIDO},
    )

    class Meta:
        model = PlanoDeGuardar
        fields = ("valor_mensal", "mes_alvo")

    def validate_valor_mensal(self, valor):
        if valor is not None and valor < 0:
            raise serializers.ValidationError(VALOR_NEGATIVO)
        return valor

    def validate_mes_alvo(self, mes):
        # A view manda o mês atual do app (dia 1) no context; o mês atual vale
        if mes is not None and mes < self.context["mes_atual"]:
            raise serializers.ValidationError(MES_ALVO_NO_PASSADO)
        return mes

    def validate(self, dados):
        # Com partial=True, "dados" só tem o que veio no PATCH; o que não veio
        # continua como está salvo. O plano precisa dos dois ou de nenhum
        valor = dados.get("valor_mensal", self.instance.valor_mensal)
        mes = dados.get("mes_alvo", self.instance.mes_alvo)
        if (valor is None) != (mes is None):
            raise serializers.ValidationError(PLANO_INCOMPLETO)
        return dados


class ParcelaSerializer(serializers.ModelSerializer):
    # O mês sai como "2026-11", igual ao mes_alvo do plano
    mes = serializers.DateField(format="%Y-%m")
    atrasada = serializers.SerializerMethodField()

    class Meta:
        model = ParcelaDaDivida
        fields = ("id", "numero", "mes", "valor", "paga", "atrasada")

    def get_atrasada(self, parcela):
        # Não paga e de um mês antes do mês atual do app (o mesmo critério do
        # dividas_atrasadas do resumo). A view manda o mês atual (dia 1) no
        # context; os serializers de dentro recebem o mesmo context
        return not parcela.paga and parcela.mes < self.context["mes_atual"]


class ProximaParcelaSerializer(ParcelaSerializer):
    # A mesma parcela, sem o "paga" (a próxima nunca está paga)
    class Meta(ParcelaSerializer.Meta):
        fields = ("id", "numero", "mes", "valor", "atrasada")


class DividaSerializer(serializers.ModelSerializer):
    # Só a saída (GET e as respostas); a entrada é do NovaDividaSerializer e
    # do EditarDividaSerializer. Os campos de conta vêm das @property do model.
    # DecimalField para o dinheiro sair como texto ("333.33"), não float
    parcelas_pagas = serializers.IntegerField(read_only=True)
    valor_pago = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    valor_restante = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    # None (null no JSON) quando todas estão pagas
    proxima_parcela = ProximaParcelaSerializer(read_only=True, allow_null=True)
    parcelas = ParcelaSerializer(many=True, read_only=True)
    # O mês da primeira parcela sai como "2026-11", para o app preencher a edição
    mes_inicio = serializers.DateField(format="%Y-%m", read_only=True)

    class Meta:
        model = Divida
        fields = (
            "id",
            "credor",
            "motivo",
            "valor_total",
            "total_parcelas",
            "mes_inicio",
            "parcelas_pagas",
            "valor_pago",
            "valor_restante",
            "proxima_parcela",
            "parcelas",
        )


class NovaDividaSerializer(serializers.Serializer):
    # Entrada do POST. Serializer comum (não ModelSerializer) porque "parcelas"
    # é um número aqui e vira as ParcelaDaDivida no service
    credor = serializers.CharField(max_length=100, error_messages=ERROS_DO_CREDOR)
    motivo = serializers.CharField(
        max_length=200, allow_blank=True, required=False, default=""
    )
    valor_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    parcelas = serializers.IntegerField(
        min_value=1,
        max_value=120,
        error_messages={
            "min_value": PARCELAS_INVALIDAS,
            "max_value": PARCELAS_INVALIDAS,
        },
    )
    # "2026-11" vira 01/11/2026, como o mes_alvo do plano
    mes_inicio = serializers.DateField(
        input_formats=["%Y-%m"], error_messages={"invalid": MES_INICIO_INVALIDO}
    )

    def validate_valor_total(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(VALOR_INVALIDO)
        return valor

    def create(self, dados):
        # serializer.save() chama este método com os dados já validados; quem
        # grava a dívida e gera as parcelas é o service
        return criar_divida(**dados)


class EditarDividaSerializer(NovaDividaSerializer):
    # Entrada do PATCH da dívida: os mesmos cinco campos e validações do
    # cadastro. A view usa partial=True, então todos são opcionais
    def update(self, divida, dados):
        # serializer.save() chama este método porque o serializer tem instance
        try:
            return editar_divida(divida, **dados)
        except DividaComParcelaPaga:
            # "detail" é a chave que o app já lê nos outros 400 sem campo
            raise serializers.ValidationError({"detail": [COM_PARCELA_PAGA]})


class MarcarParcelaSerializer(serializers.Serializer):
    # Entrada do PATCH da parcela: {"paga": true} ou {"paga": false}
    paga = serializers.BooleanField()


class GastoFixoSerializer(serializers.ModelSerializer):
    # Só a saída (GET e as respostas); a entrada é do EntradaGastoFixoSerializer.
    # O mês sai como "2026-11", igual ao das dívidas
    mes_inicio = serializers.DateField(format="%Y-%m")
    este_mes = serializers.SerializerMethodField()

    class Meta:
        model = GastoFixo
        fields = (
            "id",
            "nome",
            "valor",
            "dia_vencimento",
            "mes_inicio",
            "trecho_descricao",
            "este_mes",
        )

    def get_este_mes(self, gasto):
        # A view manda no context o mês atual do app (dia 1) e a situação de
        # cada gasto ({id: situacao}), já calculadas numa vez só
        mes = self.context["mes_atual"]
        situacao = self.context["situacoes"][gasto.id]
        return {"mes": mes.strftime("%Y-%m"), "situacao": situacao}


class EntradaGastoFixoSerializer(serializers.ModelSerializer):
    # Entrada do POST e do PATCH. Os campos são declarados aqui para trocar as
    # mensagens padrão do DRF pelas nossas
    nome = serializers.CharField(max_length=100, error_messages=ERROS_DO_NOME)
    valor = serializers.DecimalField(max_digits=12, decimal_places=2)
    dia_vencimento = serializers.IntegerField(
        min_value=1,
        max_value=31,
        allow_null=True,
        required=False,
        error_messages={"min_value": DIA_INVALIDO, "max_value": DIA_INVALIDO},
    )
    mes_inicio = serializers.DateField(
        input_formats=["%Y-%m"],
        error_messages={
            "invalid": MES_INICIO_INVALIDO,
            "required": MES_INICIO_INVALIDO,
        },
    )
    trecho_descricao = serializers.CharField(
        max_length=100, allow_blank=True, required=False
    )

    class Meta:
        model = GastoFixo
        fields = ("nome", "valor", "dia_vencimento", "mes_inicio", "trecho_descricao")

    def validate_valor(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(VALOR_INVALIDO)
        return valor

    def validate_trecho_descricao(self, trecho):
        # O CharField do DRF já tirou os espaços das pontas, então "  ab " chega
        # como "ab" e é guardado assim. Vazio vale (pago só à mão); um trecho
        # curto casaria com saídas demais e marcaria o fixo como pago por engano
        if trecho and len(trecho) < 3:
            raise serializers.ValidationError(TRECHO_CURTO)
        return trecho
