# Imagem do backend para o servidor (docker-compose.prod.yml). Em
# desenvolvimento o Django continua rodando no .venv, com o runserver.
FROM python:3.14-slim

# Sem arquivos .pyc e com o log do Python saindo na hora (docker compose logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Primeiro só as dependências: se o requirements.txt não mudou, o Docker
# reaproveita esta camada e o build fica rápido
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Junta o CSS e o JS do admin em staticfiles/ (o WhiteNoise serve de lá). O
# collectstatic carrega o settings.py, que exige estas variáveis; aqui valem
# valores de mentira, só para o build (os de verdade vêm do .env ao rodar)
RUN DJANGO_SECRET_KEY=build PLUGGY_CLIENT_ID=build PLUGGY_CLIENT_SECRET=build \
    POSTGRES_DB=build POSTGRES_USER=build POSTGRES_PASSWORD=build \
    POSTGRES_HOST=build POSTGRES_PORT=5432 \
    python manage.py collectstatic --noinput

EXPOSE 8000

# Gunicorn no lugar do runserver (que não é feito para produção); 2 processos
# bastam para uma pessoa só
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
