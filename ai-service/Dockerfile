FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para httpx/SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Render usa la variable PORT (normalmente 10000)
EXPOSE ${PORT:-8000}

# Arrancar uvicorn — Render inyecta PORT automáticamente
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
