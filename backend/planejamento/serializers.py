from rest_framework import serializers

from planejamento.models import Configuracao

DIAS_INVALIDOS = "Os dias antes do mês precisam ficar entre 0 e 10."
LIMITE_NEGATIVO = "O limite da fatura não pode ser negativo."


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
