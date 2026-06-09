#!/bin/sh
# Injecte les variables d'environnement dans le build Next.js au runtime
# Les placeholders __VAR_NAME__ sont remplacés par les valeurs du .env

set -e

echo "🔧 Injection des variables d'environnement..."

# Fonction pour remplacer les placeholders dans les fichiers JS
dotenv_substitute() {
  local placeholder=$1
  local value=$2
  local file=$3
  
  if [ -n "$value" ]; then
    # Échapper les caractères spéciaux pour sed
    local escaped_value=$(echo "$value" | sed 's/[&/\]/\\&/g')
    sed -i "s|${placeholder}|${escaped_value}|g" "$file" 2>/dev/null || true
  fi
}

# Fichiers à modifier (JS générés par Next.js)
STATIC_DIR="./.next/static"
SERVER_FILE="./server.js"

if [ -d "$STATIC_DIR" ]; then
  echo "→ Remplacement dans les fichiers statiques..."
  
  # Trouver tous les fichiers JS et remplacer les placeholders
  find "$STATIC_DIR" -name "*.js" -type f | while read -r file; do
    dotenv_substitute "__NEXT_PUBLIC_API_BASE_URL__" "$NEXT_PUBLIC_API_BASE_URL" "$file"
    dotenv_substitute "__NEXT_PUBLIC_KEYCLOAK_URL__" "$NEXT_PUBLIC_KEYCLOAK_URL" "$file"
    dotenv_substitute "__NEXT_PUBLIC_KEYCLOAK_REALM__" "$NEXT_PUBLIC_KEYCLOAK_REALM" "$file"
    dotenv_substitute "__NEXT_PUBLIC_KEYCLOAK_CLIENT_ID__" "$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID" "$file"
  done
fi

echo "✅ Variables injectées"
echo "  API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-non définie}"
echo "  KEYCLOAK_URL: ${NEXT_PUBLIC_KEYCLOAK_URL:-non définie}"
echo ""

# Démarrer le serveur Next.js
exec node server.js
