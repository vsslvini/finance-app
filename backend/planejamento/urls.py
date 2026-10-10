from django.urls import path

from planejamento import views

urlpatterns = [
    path("configuracoes/", views.configuracoes, name="configuracoes"),
]
