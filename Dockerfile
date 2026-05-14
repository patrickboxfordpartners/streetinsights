FROM node:22-slim

# ── System deps: Python 3.11 + git ────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && python3 -m ensurepip --upgrade \
    && pip3 install --no-cache-dir --upgrade pip

WORKDIR /app

# ── Node deps ─────────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm install --omit=dev

# ── Clone Vibe-Trading and install Python deps ────────────────────────────
RUN git clone --depth 1 https://github.com/HKUDS/Vibe-Trading.git /vibe-trading

COPY requirements-vibe.txt /vibe-trading/requirements-vibe.txt
RUN pip3 install --no-cache-dir -r /vibe-trading/requirements-vibe.txt

# ── App source ────────────────────────────────────────────────────────────
COPY tsconfig*.json ./
COPY worker.ts ./
COPY src/ ./src/

# vibe-trading config — set in Railway environment variables
ENV VIBE_TRADING_DIR=/vibe-trading
ENV VIBE_PYTHON=/usr/bin/python3

# Startup script: writes vibe-trading .env from Railway env vars, then starts worker
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
