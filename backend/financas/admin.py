from django.contrib import admin

from .models import Categoria, Conexao, Conta, Investimento, Transacao


@admin.register(Conexao)
class ConexaoAdmin(admin.ModelAdmin):
    list_display = ("nome_banco", "id_pluggy", "ultima_atualizacao")


@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display = ("nome", "conexao", "tipo", "saldo")


@admin.register(Transacao)
class TransacaoAdmin(admin.ModelAdmin):
    list_display = ("data", "descricao", "valor", "conta", "categoria_exibida")


@admin.register(Investimento)
class InvestimentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "conexao", "tipo", "saldo", "status")


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    # Só leitura: as categorias vêm da Pluggy e são regravadas a cada
    # sincronização, então mudar por aqui não adiantaria
    list_display = ("descricao", "descricao_pt", "id_pluggy", "id_pai")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
