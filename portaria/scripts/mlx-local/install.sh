#!/usr/bin/env bash
#
# install.sh — instala o launchd do servidor de chat MLX da PORTARIA
# (Qwen3-8B-4bit, porta 8098) a partir do template com.portaria.mlx-chat.plist.
#
# Padrão inspirado no launchd do projeto DECIMA (com.decima.mlx-embeddings).
#
# Uso:
#   ./install.sh                  # defaults (uv do Homebrew, porta 8098, localhost)
#   MLX_CHAT_PORT=8098 ./install.sh
#
# O script SÓ preenche placeholders e copia o plist para
# ~/Library/LaunchAgents — NÃO faz `launchctl load`. Isso fica como
# decisão manual de quem instala (ver README.md).

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$DIR/com.portaria.mlx-chat.plist"
DEST="$HOME/Library/LaunchAgents/com.portaria.mlx-chat.plist"

# ---- Configuração (override por variável de ambiente) ----------------------
UV_PATH="${UV_PATH:-/opt/homebrew/bin/uv}"
MLX_CHAT_MODEL="${MLX_CHAT_MODEL:-mlx-community/Qwen3-8B-4bit}"
MLX_CHAT_HOST="${MLX_CHAT_HOST:-127.0.0.1}"
MLX_CHAT_PORT="${MLX_CHAT_PORT:-8098}"
LOG_DIR="${MLX_CHAT_LOG_DIR:-$HOME/.portaria/mlx-chat}"

# ---- Verificações -----------------------------------------------------------
if [ ! -x "$UV_PATH" ]; then
  echo "ERRO: uv não encontrado em $UV_PATH (instalar com 'brew install uv' ou definir UV_PATH)." >&2
  exit 1
fi
if [ ! -f "$TEMPLATE" ]; then
  echo "ERRO: template não encontrado: $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

# ---- Preencher placeholders e copiar ----------------------------------------
sed -e "s|__UV_PATH__|$UV_PATH|g" \
    -e "s|__MLX_CHAT_MODEL__|$MLX_CHAT_MODEL|g" \
    -e "s|__MLX_HOST__|$MLX_CHAT_HOST|g" \
    -e "s|__MLX_CHAT_PORT__|$MLX_CHAT_PORT|g" \
    -e "s|__LOG_DIR__|$LOG_DIR|g" \
    "$TEMPLATE" > "$DEST"

echo "Plist instalado em: $DEST"
echo "  modelo : $MLX_CHAT_MODEL (thinking desativado — ver plist)"
echo "  bind   : $MLX_CHAT_HOST:$MLX_CHAT_PORT"
echo "  logs   : $LOG_DIR/server.log, $LOG_DIR/server.err.log"
echo
echo "Para arrancar (manual e consciente):"
echo "  launchctl load $DEST"
echo
echo "Para parar:"
echo "  launchctl unload $DEST"
echo
echo "NOTA: o servidor liga-se apenas a $MLX_CHAT_HOST (localhost). Não o"
echo "expoças sem autenticação — ver README.md (produção: Tailscale/Cloudflare)."
