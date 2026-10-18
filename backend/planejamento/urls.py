from django.urls import path

from planejamento import views

urlpatterns = [
    path("configuracoes/", views.configuracoes, name="configuracoes"),
    path("plano/", views.plano, name="plano"),
    path("dividas/", views.dividas, name="dividas"),
    path("dividas/<int:pk>/", views.divida, name="divida"),
    path("parcelas/<int:pk>/", views.parcela, name="parcela"),
    path("gastos-fixos/", views.gastos_fixos, name="gastos-fixos"),
    path("gastos-fixos/<int:pk>/", views.gasto_fixo, name="gasto-fixo"),
    path(
        "gastos-fixos/<int:pk>/pagamentos/<str:mes>/",
        views.pagamento_do_gasto_fixo,
        name="pagamento-do-gasto-fixo",
    ),
]
