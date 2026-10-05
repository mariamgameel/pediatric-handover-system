#!/bin/bash
# ==============================================================================
# Hostinger VPS Automated Deployment Script - Pediatric Handover System
# ==============================================================================

set -e # Exit immediately if a command fails

APP_DIR="/var/www/pediatric-handover"
BRANCH="main"

echo "🚀 [1/5] Navigating to application directory..."
cd $APP_DIR

echo "📥 [2/5] Pulling latest updates from Git ($BRANCH)..."
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

echo "📦 [3/5] Installing dependencies..."
npm install --omit=dev

echo "🗄️ [4/5] Applying Prisma database migrations..."
npx prisma migrate deploy

echo "🔄 [5/5] Reloading PM2 cluster with zero downtime..."
pm2 reload ecosystem.config.js --env production

echo "=================================================================="
echo "✅ DEPLOYMENT FINISHED SUCCESSFULLY!"
echo "=================================================================="
pm2 status pediatric-handover
