from decimal import Decimal

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


class PlanoDeGuardar(models.Model):
    # Os dois vazios (NULL) = sem plano (RF28). A API só aceita os dois
    # preenchidos ou os dois vazios
    valor_mensal = models.DecimalField(
        "valor por mês", max_digits=12, decimal_places=2, null=True, blank=True
    )
    # Sempre o dia 1 do mês alvo: só o mês e o ano importam
    mes_alvo = models.DateField("mês alvo", null=True, blank=True)

    class Meta:
        verbose_name = "plano de guardar"
        verbose_name_plural = "planos de guardar"

    def __str__(self):
        return "Plano de guardar"

    @classmethod
    def atual(cls):
        # Uma linha só (pk=1), como a Configuracao
        plano, _ = cls.objects.get_or_create(pk=1)
        return plano


class Divida(models.Model):
    # RF21: uma dívida com alguém, dividida em parcelas mensais. Ao cadastrar,
    # o services/dividas.py gera as ParcelaDaDivida; depois só credor e motivo
    # mudam (para mudar valor ou parcelas, apaga e cadastra de novo)
    credor = models.CharField("para quem", max_length=100)
    motivo = models.CharField(max_length=200, blank=True)
    valor_total = models.DecimalField("valor total", max_digits=12, decimal_places=2)
    # "total_parcelas", e não "parcelas": "parcelas" é o nome da ligação com as
    # ParcelaDaDivida (divida.parcelas.all())
    total_parcelas = models.PositiveSmallIntegerField(
        "número de parcelas",
        validators=[MinValueValidator(1), MaxValueValidator(120)],
    )
    # Sempre o dia 1 do mês da primeira parcela, como o mes_alvo do plano
    mes_inicio = models.DateField("mês da primeira parcela")
    criada_em = models.DateTimeField("criada em", auto_now_add=True)

    class Meta:
        verbose_name = "dívida"
        verbose_name_plural = "dívidas"

    def __str__(self):
        return f"{self.credor} ({self.valor_total})"

    # As contas abaixo usam self.parcelas.all(), e não filter() ou aggregate():
    # a view busca as parcelas junto (prefetch_related), e o all() reaproveita
    # essa busca em vez de ir ao banco de novo para cada dívida

    @property
    def parcelas_pagas(self):
        return sum(1 for parcela in self.parcelas.all() if parcela.paga)

    @property
    def valor_pago(self):
        pagas = (parcela.valor for parcela in self.parcelas.all() if parcela.paga)
        return sum(pagas, Decimal("0.00"))

    @property
    def valor_restante(self):
        return self.valor_total - self.valor_pago

    @property
    def proxima_parcela(self):
        # A primeira não paga (as parcelas vêm em ordem de número); None se
        # todas estão pagas
        for parcela in self.parcelas.all():
            if not parcela.paga:
                return parcela
        return None


class ParcelaDaDivida(models.Model):
    # CASCADE: apagar a dívida apaga as parcelas (decisão 4 do Módulo 12).
    # Diferente das transações (PROTECT): aqui as parcelas não têm sentido
    # sozinhas e são recriadas ao cadastrar de novo
    divida = models.ForeignKey(
        Divida, on_delete=models.CASCADE, related_name="parcelas"
    )
    numero = models.PositiveSmallIntegerField("número")
    # Dia 1 do mês em que a parcela vence
    mes = models.DateField("mês")
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    # Marcada no app quando o pagamento de verdade (ex.: um PIX) já saiu: a
    # partir daí a parcela não conta mais, porque o PIX já está nas saídas
    paga = models.BooleanField(default=False)
    paga_em = models.DateField("paga em", null=True, blank=True)

    class Meta:
        verbose_name = "parcela da dívida"
        verbose_name_plural = "parcelas da dívida"
        # Ordem padrão: a 1ª parcela primeiro (vale também no prefetch)
        ordering = ("numero",)

    def __str__(self):
        return f"Parcela {self.numero} de {self.divida}"
