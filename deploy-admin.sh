#!/bin/bash
# Deploy admin SPA to Cloudflare Pages (production)
set -e
cd /home/ubuntu/rovrs

# Clean old build
rm -rf admin/dist

# Build admin SPA (vite root is admin/, outDir 'dist' goes to admin/dist)
npx vite build --config admin/vite.config.ts

# Swap wrangler.toml for D1 binding
mv wrangler.toml wrangler.toml.worker.bak
cp admin/wrangler.toml wrangler.toml

# Copy admin functions to root so wrangler finds them
rm -rf /tmp/rovrs-functions
cp -r admin/functions /tmp/rovrs-functions
rm -rf functions
cp -r /tmp/rovrs-functions functions

# Deploy to production
npx wrangler pages deploy admin/dist --project-name rovrs-admin --branch main --commit-dirty=true --skip-caching

# Restore worker config and clean up
rm -rf functions
mv wrangler.toml.worker.bak wrangler.toml

# Purge CDN cache for admin.rov.rs
ZONE_ID="e436d011d4de81bd15cca6a15aff5c0c"
CF_TOKEN=$(grep oauth_token ~/.wrangler/config/default.toml 2>/dev/null | cut -d'"' -f2)
if [ -n "$CF_TOKEN" ]; then
  echo "Purging CDN cache..."
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"purge_everything":true}' | python3 -c "import json,sys; r=json.load(sys.stdin); print('Cache purged' if r.get('success') else f'Purge failed: {r}')" 2>/dev/null || echo "Cache purge skipped"
fi

echo "Admin deployed to production at admin.rov.rs"
