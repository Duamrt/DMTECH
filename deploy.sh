#!/bin/bash
VERSION="v$(date +%m%d%H%M)"
echo "🚀 Deploy DMTechApp $VERSION"

# Atualiza versão em todos os arquivos JS/HTML
find . -name "*.js" -not -path "./.git/*" -exec sed -i "s/const VERSION = 'v[0-9]*'/const VERSION = '$VERSION'/g" {} \;

git add -A
git commit -m "deploy $VERSION"
git push origin main

echo "✅ No ar: $VERSION"
