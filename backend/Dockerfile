FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /install /usr/local
RUN adduser --disabled-password --no-create-home appuser
RUN mkdir -p /home/appuser/.cache/chroma && chown -R appuser:appuser /home/appuser/.cache
RUN playwright install-deps chromium
USER appuser
RUN playwright install chromium
USER root
COPY app/ app/
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
