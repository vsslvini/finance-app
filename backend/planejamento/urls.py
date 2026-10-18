from django.urls import path

from planejamento import views

urlpatterns = [
    path("configuracoes/", views.configuracoes, name="configuracoes"),
    path("plano/", views.plano, name="plano"),
    path("dividas/", views.dividas, name="dividas"),
    path("dividas/<int:pk>/", views.divida, name="divida"),
    path("parcelas/<int:pk>/", views.parcela, name="parcela"),
]
