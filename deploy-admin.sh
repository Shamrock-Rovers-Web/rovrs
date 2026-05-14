#!/bin/bash
# Deploy admin SPA to Cloudflare Pages (production)
set -e
cd /home/ubuntu/rovrs

# Build admin SPA
npx vite build --config admin/vite.config.ts --outDir admin/dist

# Remove the broken _worker.js from dist if present
rm -f admin/dist/_worker.js

# Swap wrangler.toml for D1 binding
mv wrangler.toml wrangler.toml.worker.bak
cp admin/wrangler.toml wrangler.toml

# Copy admin functions to root so wrangler finds them
rm -rf /tmp/rovrs-functions
cp -r admin/functions /tmp/rovrs-functions
rm -rf functions
cp -r /tmp/rovrs-functions functions

# Deploy to production
npx wrangler pages deploy admin/dist --project-name rovrs-admin --branch main --commit-dirty=true

# Restore worker config and clean up
rm -rf functions
mv wrangler.toml.worker.bak wrangler.toml

echo "Admin deployed to production at admin.rov.rs"
