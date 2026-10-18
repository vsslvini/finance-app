from django.contrib import admin

from .models import (
    Configuracao,
    Divida,
    GastoFixo,
    PagamentoDeGastoFixo,
    ParcelaDaDivida,
    PlanoDeGuardar,
)


@admin.register(Configuracao)
class ConfiguracaoAdmin(admin.ModelAdmin):
    list_display = ("__str__", "dias_antes_do_mes", "limite_fatura", "renda_mensal")

    def has_add_permission(self, request):
        # Linha única: quem cria é o Configuracao.atual() (na primeira chamada
        # da API); no admin só se edita
        return False


@admin.register(PlanoDeGuardar)
class PlanoDeGuardarAdmin(admin.ModelAdmin):
    list_display = ("__str__", "valor_mensal", "mes_alvo")

    def has_add_permission(self, request):
        # Linha única, como a Configuracao: quem cria é o PlanoDeGuardar.atual()
        return False


class ParcelaDaDividaInline(admin.TabularInline):
    # As parcelas aparecem dentro da página da dívida, em tabela
    model = ParcelaDaDivida
    extra = 0


@admin.register(Divida)
class DividaAdmin(admin.ModelAdmin):
    list_display = ("credor", "motivo", "valor_total", "total_parcelas", "mes_inicio")
    inlines = (ParcelaDaDividaInline,)

    def has_add_permission(self, request):
        # Quem cria é a API (POST /api/dividas/), que gera as parcelas; uma
        # dívida criada aqui ficaria sem parcelas
        return False


class PagamentoDeGastoFixoInline(admin.TabularInline):
    # Os meses marcados como pagos à mão aparecem dentro da página do gasto
    model = PagamentoDeGastoFixo
    extra = 0


@admin.register(GastoFixo)
class GastoFixoAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "valor",
        "dia_vencimento",
        "mes_inicio",
        "trecho_descricao",
    )
    inlines = (PagamentoDeGastoFixoInline,)
