#!/bin/bash

# Quick Android Build Script (Alternative to EAS)
# Usage: ./build-android.sh

echo "🏗️  Building Android APK locally..."
echo ""

# Navigate to android directory
cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "📦 Building release APK..."
./gradlew assembleRelease

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📱 Your APK is ready at:"
    echo "   android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "📲 To install on device:"
    echo "   adb install app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "📤 You can also share the APK file directly"
    echo ""
    
    # Open the output directory
    open app/build/outputs/apk/release/
else
    echo ""
    echo "❌ Build failed. Check the errors above."
    echo ""
fi

cd ..
