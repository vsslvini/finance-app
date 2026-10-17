from django.contrib import admin

from .models import Configuracao, PlanoDeGuardar


@admin.register(Configuracao)
class ConfiguracaoAdmin(admin.ModelAdmin):
    list_display = ("__str__", "dias_antes_do_mes", "limite_fatura")

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
