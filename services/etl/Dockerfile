FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY services/etl/requirements.txt /app/services/etl/requirements.txt
RUN pip install --no-cache-dir -r /app/services/etl/requirements.txt
COPY config /app/config
COPY database /app/database
COPY services/etl /app/services/etl

ENV PYTHONPATH=/app/services/etl PYTHONUNBUFFERED=1 SPARK_LOCAL_IP=127.0.0.1
ENTRYPOINT ["python", "-m", "lila_etl"]
