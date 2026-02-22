#!/bin/bash

# Android Icon Generator Script for KOTGEP Mobile App
# Usage: ./generate-icons.sh path/to/your/logo.png

if [ -z "$1" ]; then
    echo "❌ Error: Please provide the path to your logo image"
    echo "Usage: ./generate-icons.sh path/to/kotgep-logo.png"
    exit 1
fi

LOGO_PATH="$1"

if [ ! -f "$LOGO_PATH" ]; then
    echo "❌ Error: File not found: $LOGO_PATH"
    exit 1
fi

echo "🎨 Generating Android app icons from: $LOGO_PATH"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing via Homebrew..."
    brew install imagemagick
fi

# Base directory for Android resources
BASE_DIR="android/app/src/main/res"

# Icon sizes for different densities
declare -A SIZES=(
    ["mdpi"]=48
    ["hdpi"]=72
    ["xhdpi"]=96
    ["xxhdpi"]=144
    ["xxxhdpi"]=192
)

# Generate icons for each density
for density in "${!SIZES[@]}"; do
    size=${SIZES[$density]}
    output_dir="$BASE_DIR/mipmap-$density"
    
    echo "📱 Generating ${density} icons (${size}x${size})..."
    
    # Create directory if it doesn't exist
    mkdir -p "$output_dir"
    
    # Generate standard icon
    convert "$LOGO_PATH" -resize ${size}x${size} "$output_dir/ic_launcher.png"
    
    # Generate round icon (same image, Android handles the shape)
    convert "$LOGO_PATH" -resize ${size}x${size} "$output_dir/ic_launcher_round.png"
    
    echo "✅ Created icons in $output_dir"
done

echo ""
echo "🎉 Icon generation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run: cd android && ./gradlew clean && cd .."
echo "2. Rebuild your app: npm run android"
echo "3. Your new KOTGEP logo will appear as the app icon!"
echo ""
