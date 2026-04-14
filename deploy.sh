#!/bin/bash
VERSION="v$(date +%m%d%H%M)"
VER_SHORT="$(date +%m%d%H%M)"
echo "🚀 Deploy DMTechApp $VERSION"

# Atualiza versão em todos os arquivos JS e HTML
find . -name "*.js" -not -path "./.git/*" -exec sed -i "s/const VERSION = 'v[0-9]*'/const VERSION = '$VERSION'/g" {} \;
find . -name "*.html" -not -path "./.git/*" -exec sed -i "s/const VERSION = 'v[0-9]*'/const VERSION = '$VERSION'/g" {} \;

# Atualiza cache do Service Worker
sed -i "s/const VERSION = 'v[0-9]*'/const VERSION = '$VERSION'/" sw.js

# Cache busting: atualiza ?v= nas tags HTML
find . -name "*.html" -not -path "./.git/*" -exec sed -i "s/?v=[0-9]*/?v=$VER_SHORT/g" {} \;

git add -A
git commit -m "deploy $VERSION"
git push origin main

echo "✅ No ar: $VERSION"
