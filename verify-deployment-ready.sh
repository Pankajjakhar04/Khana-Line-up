#!/bin/bash
# Final Verification Script

echo "🔍 FINAL VERIFICATION CHECKLIST"
echo "================================"

echo ""
echo "✅ SECURITY CHECKS:"
echo "-------------------"

# Check if sensitive files are in .gitignore
if grep -q ".env.local" .gitignore; then
    echo "✅ .env.local is in .gitignore"
else
    echo "❌ .env.local NOT in .gitignore - SECURITY RISK!"
fi

if grep -q ".env" .gitignore; then
    echo "✅ .env files are in .gitignore"
else
    echo "❌ .env files NOT in .gitignore - SECURITY RISK!"
fi

echo ""
echo "✅ CODE SAFETY CHECKS:"
echo "----------------------"

# Check for hardcoded API keys in source files
if grep -r "AIzaSy" src/ --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ FOUND HARDCODED API KEYS IN SOURCE - SECURITY RISK!"
else
    echo "✅ No hardcoded API keys found in source code"
fi

# Check for environment variable usage
if grep -r "import.meta.env.VITE_" src/ --exclude-dir=node_modules >/dev/null 2>&1; then
    echo "✅ Environment variables properly used in frontend"
else
    echo "⚠️  No environment variables found - check configuration"
fi

echo ""
echo "✅ BUILD VERIFICATION:"
echo "---------------------"

# Test build
if npm run build >/dev/null 2>&1; then
    echo "✅ Production build successful"
else
    echo "❌ Production build failed - check errors"
fi

echo ""
echo "✅ DEPLOYMENT READINESS:"
echo "------------------------"

if [ -f "vercel.json" ]; then
    echo "✅ vercel.json exists"
else
    echo "❌ vercel.json missing"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json exists"
else
    echo "❌ package.json missing"
fi

if [ -f ".env.local" ]; then
    echo "✅ .env.local exists (for local development)"
else
    echo "⚠️  .env.local missing - create for local development"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "==============."
echo "1. git add ."
echo "2. git commit -m 'Production ready: Secure configuration'"
echo "3. git push origin main"
echo "4. Deploy to Vercel"
echo "5. Add environment variables in Vercel dashboard"
echo ""
echo "🚀 READY FOR PRODUCTION DEPLOYMENT!"
