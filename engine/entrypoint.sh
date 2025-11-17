#!/bin/sh

echo "🚀 Starting Mail Hooks Engine..."

# Run database migrations
echo "📦 Running database migrations..."
node migrations/init.js

if [ $? -ne 0 ]; then
  echo "❌ Database migrations failed"
  exit 1
fi

echo "✅ Migrations completed"
echo "📡 Starting SMTP server on port 25..."

# Start the SMTP service
# This would be replaced with actual smtp-webhook start command
exec npm start
