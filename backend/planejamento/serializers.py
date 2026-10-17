from rest_framework import serializers

from planejamento.models import Configuracao, PlanoDeGuardar

DIAS_INVALIDOS = "Os dias antes do mês precisam ficar entre 0 e 10."
LIMITE_NEGATIVO = "O limite da fatura não pode ser negativo."
VALOR_NEGATIVO = "O valor por mês não pode ser negativo."
MES_ALVO_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2027-07."
MES_ALVO_NO_PASSADO = "O mês alvo não pode ser antes do mês atual."
PLANO_INCOMPLETO = "Preencha o valor por mês e o mês alvo, ou deixe os dois vazios."


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
