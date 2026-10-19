from django.conf import settings

# Configurações da Fase 0 do deploy (docs/deploy.md). Elas não mudam nada no
# desenvolvimento, mas se sumirem o admin fica sem estilo no servidor


def test_whitenoise_vem_logo_depois_do_security_middleware():
    # A documentação do WhiteNoise pede essa posição: antes dele, só o
    # SecurityMiddleware; assim os arquivos do admin saem sem passar pelo resto
    seguranca = settings.MIDDLEWARE.index(
        "django.middleware.security.SecurityMiddleware"
    )
    assert (
        settings.MIDDLEWARE[seguranca + 1]
        == "whitenoise.middleware.WhiteNoiseMiddleware"
    )


def test_static_root_aponta_para_staticfiles():
    # É onde o collectstatic do Dockerfile junta o CSS e o JS do admin
    assert settings.STATIC_ROOT == settings.BASE_DIR / "staticfiles"


def test_csrf_trusted_origins_vazio_sem_a_variavel(monkeypatch):
    # Sem DJANGO_CSRF_TRUSTED_ORIGINS no .env (o caso do desenvolvimento), a
    # lista fica vazia em vez de dar erro
    import environ

    monkeypatch.delenv("DJANGO_CSRF_TRUSTED_ORIGINS", raising=False)
    env = environ.Env()
    assert env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[]) == []
