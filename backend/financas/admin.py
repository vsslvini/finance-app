from django.contrib import admin

from .models import Conexao, Conta, Investimento, Transacao


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
