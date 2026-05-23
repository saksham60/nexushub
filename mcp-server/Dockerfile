FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src \
    NEXUSHUB_MODE=graph \
    MCP_TRANSPORT=streamable-http \
    MCP_HTTP_PATH=/mcp

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src

EXPOSE 8010
CMD ["python", "-m", "nexushub_mcp"]
