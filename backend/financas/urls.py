from django.urls import path

from financas import views

urlpatterns = [
    path("contas/", views.ContasView.as_view(), name="contas"),
    path("transacoes/", views.TransacoesView.as_view(), name="transacoes"),
    # <int:pk>: só aceita número e entrega à view como o argumento "pk"
    path("transacoes/<int:pk>/", views.trocar_categoria, name="trocar-categoria"),
    path("categorias/", views.CategoriasView.as_view(), name="categorias"),
    path("resumo/", views.resumo, name="resumo"),
    path("relatorio/", views.relatorio, name="relatorio"),
    path("faturas-futuras/", views.faturas_futuras, name="faturas-futuras"),
    path("sincronizar/", views.sincronizar, name="sincronizar"),
]
