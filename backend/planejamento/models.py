from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Configuracao(models.Model):
    # Quantos dias antes do dia 1 o mês do app começa (RF30): com 2, outubro
    # começa em 29/09, e o salário do fim de setembro conta em outubro
    dias_antes_do_mes = models.PositiveSmallIntegerField(
        "dias antes do mês",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    # Vazio (NULL) = sem limite, sem aviso na tela Início (RF31)
    limite_fatura = models.DecimalField(
        "limite da fatura", max_digits=12, decimal_places=2, null=True, blank=True
    )

    class Meta:
        verbose_name = "configuração"
        verbose_name_plural = "configurações"

    def __str__(self):
        return "Configurações do app"

    @classmethod
    def atual(cls):
        # Uma linha só (pk=1): busca, ou cria com os padrões na primeira vez
        configuracao, _ = cls.objects.get_or_create(pk=1)
        return configuracao
