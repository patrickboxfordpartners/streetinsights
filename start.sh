#!/bin/sh
# Write vibe-trading .env from Railway environment variables at startup
# This keeps secrets out of the image layers

mkdir -p /vibe-trading/agent

cat > /vibe-trading/agent/.env << EOF
LANGCHAIN_MODEL_NAME=grok-3-latest
OPENAI_API_KEY=${XAI_API_KEY}
OPENAI_BASE_URL=https://api.x.ai/v1
EOF

echo "[start.sh] Vibe-Trading .env written"

npx tsx worker.ts
echo "[start.sh] Worker exited with code $?"
