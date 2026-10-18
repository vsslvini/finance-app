from django.db import models


class Conexao(models.Model):
    id_pluggy = models.CharField(max_length=100, unique=True)
    nome_banco = models.CharField(max_length=100)
    ultima_atualizacao = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "conexão"
        verbose_name_plural = "conexões"

    def __str__(self):
        return self.nome_banco


class Conta(models.Model):
    class Tipo(models.TextChoices):
        CORRENTE = "corrente", "Conta corrente"
        CARTAO = "cartao", "Cartão de crédito"

    # PROTECT: apagar uma conexão por engano no admin levaria junto os gastos
    # manuais e as categorias manuais, que não dá para recuperar da Pluggy
    conexao = models.ForeignKey(Conexao, on_delete=models.PROTECT)
    # null=True: o banco aceita vários NULL numa coluna unique
    id_pluggy = models.CharField(max_length=100, unique=True, null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    nome = models.CharField(max_length=100)
    saldo = models.DecimalField(max_digits=12, decimal_places=2)
    # Campos só do cartão de crédito
    limite_total = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    limite_disponivel = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    data_fechamento = models.DateField(null=True, blank=True)
    data_vencimento = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.nome


class Transacao(models.Model):
    conta = models.ForeignKey(Conta, on_delete=models.PROTECT)
    data = models.DateField()
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    categoria_pluggy = models.CharField(max_length=100, blank=True, default="")
    categoria_manual = models.CharField(max_length=100, blank=True, default="")
    parcela_atual = models.PositiveSmallIntegerField(null=True, blank=True)
    total_parcelas = models.PositiveSmallIntegerField(null=True, blank=True)
    # Vazio (NULL) nas transações manuais; o banco aceita vários NULL em unique
    id_pluggy = models.CharField(max_length=100, unique=True, null=True, blank=True)

    class Meta:
        verbose_name = "transação"
        verbose_name_plural = "transações"

    def __str__(self):
        return f"{self.data} {self.descricao} {self.valor}"

    @property
    def categoria_exibida(self):
        # "" e None contam como vazio, então o "or" pula para a próxima opção
        return self.categoria_manual or self.categoria_pluggy or "Sem categoria"


class Investimento(models.Model):
    conexao = models.ForeignKey(Conexao, on_delete=models.PROTECT)
    # Todo investimento vem da Pluggy (não há investimento manual)
    id_pluggy = models.CharField(max_length=100, unique=True)
    nome = models.CharField(max_length=255)
    # Texto da Pluggy como veio (ex.: FIXED_INCOME e CDB)
    tipo = models.CharField(max_length=30)
    subtipo = models.CharField(max_length=50, blank=True, default="")
    instituicao = models.CharField(max_length=255, blank=True, default="")
    saldo = models.DecimalField(max_digits=12, decimal_places=2)
    # ACTIVE, PENDING ou TOTAL_WITHDRAWAL (resgatado, com saldo zero)
    status = models.CharField(max_length=30, blank=True, default="")

    def __str__(self):
        return self.nome


class Categoria(models.Model):
    # A árvore de categorias da Pluggy (GET /categories), copiada a cada
    # sincronização para o app mostrar as categorias em português
    id_pluggy = models.CharField(max_length=100, unique=True)
    # O nome em inglês, o mesmo texto que vem no "category" das transações
    descricao = models.CharField(max_length=100, unique=True)
    descricao_pt = models.CharField(max_length=100, blank=True, default="")
    # Vazio nas categorias de primeiro nível (ex.: "Income")
    id_pai = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return self.descricao_pt or self.descricao

    @classmethod
    def traducoes(cls):
        # {"Groceries": "Mercado"} numa consulta só, para a API traduzir todas as
        # transações de um pedido sem uma consulta por transação
        sem_vazias = cls.objects.exclude(descricao_pt="")
        return dict(sem_vazias.values_list("descricao", "descricao_pt"))
