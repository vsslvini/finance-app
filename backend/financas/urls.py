from django.urls import path

from financas import views

urlpatterns = [
    path("contas/", views.ContasView.as_view(), name="contas"),
    path("transacoes/", views.TransacoesView.as_view(), name="transacoes"),
    path("resumo/", views.resumo, name="resumo"),
    path("faturas-futuras/", views.faturas_futuras, name="faturas-futuras"),
    path("sincronizar/", views.sincronizar, name="sincronizar"),
]
