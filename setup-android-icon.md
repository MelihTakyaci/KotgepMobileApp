# Android App Icon Setup Guide

## Quick Setup (Recommended)

### Option 1: Using Android Asset Studio (Easiest)

1. Save your logo image (the KOTGEP circular logo) to your computer
2. Go to: https://icon.kitchen/
3. Upload your logo image
4. Configure:
   - **Foreground**: Your logo image
   - **Background**: White or your preferred background color
   - **Shape**: Circle (for adaptive icon)
   - **Resize**: Adjust to fit nicely with padding
5. Click "Download" and select "Android"
6. Extract the downloaded ZIP file
7. Copy all the `mipmap-*` folders from the downloaded files to:
   ```
   android/app/src/main/res/
   ```
   (Replace existing folders when prompted)

### Option 2: Manual Setup (If you have the PNG file)

If you have saved your logo as `kotgep-logo.png`:

1. Place your high-resolution logo (at least 1024x1024px) in the project root

2. Install the image resizer tool:
   ```bash
   npm install -g sharp-cli
   ```

3. Create the icon sizes:
   ```bash
   # For mdpi (48x48)
   npx sharp -i kotgep-logo.png -o android/app/src/main/res/mipmap-mdpi/ic_launcher.png resize 48 48

   # For hdpi (72x72)
   npx sharp -i kotgep-logo.png -o android/app/src/main/res/mipmap-hdpi/ic_launcher.png resize 72 72

   # For xhdpi (96x96)
   npx sharp -i kotgep-logo.png -o android/app/src/main/res/mipmap-xhdpi/ic_launcher.png resize 96 96

   # For xxhdpi (144x144)
   npx sharp -i kotgep-logo.png -o android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png resize 144 144

   # For xxxhdpi (192x192)
   npx sharp -i kotgep-logo.png -o android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png resize 192 192
   ```

4. Also create round icons (same sizes):
   ```bash
   # Repeat above commands but output to ic_launcher_round.png
   ```

### Option 3: Using Expo (If using Expo)

1. Save your logo as `icon.png` in the project root (1024x1024px minimum)

2. Update `app.json`:
   ```json
   {
     "expo": {
       "icon": "./icon.png",
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./icon.png",
           "backgroundColor": "#FFFFFF"
         }
       }
     }
   }
   ```

3. Run:
   ```bash
   npx expo prebuild --clean
   ```

## After Setting Up Icons

1. **Clean the build**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **Rebuild the app**:
   ```bash
   npx react-native run-android
   # or
   npm run android
   ```

## Verify

After rebuilding, you should see your new KOTGEP logo as the app icon on your Android device/emulator.

## Troubleshooting

- **Icon not updating**: Clear app data and reinstall
- **Icon looks stretched**: Ensure your original image is square (1:1 ratio)
- **Build fails**: Run `cd android && ./gradlew clean` then rebuild

## Notes

- The logo you provided is already circular and well-designed for an app icon
- Make sure the image is high quality (at least 1024x1024px)
- Android will automatically apply rounded corners on supported devices
- You may want to create adaptive icons for modern Android versions
