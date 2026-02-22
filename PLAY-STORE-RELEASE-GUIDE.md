# Play Store Release Guide - Kotgep

## ✅ COMPLETED FIXES

1. ✅ Updated app icon to `kotgep-logo.png`
2. ✅ Changed package ID from `com.anonymous.GencKalemlerMobilApp` to `com.kotgep.app`
3. ✅ Fixed app slug from "GencKalemlerMobilApp" to "kotgep"
4. ✅ Updated version to "1.0.0" (consistent across files)
5. ✅ Cleaned up unnecessary permissions
6. ✅ App name is correctly set to "Kotgep" in strings.xml

---

## 🔴 CRITICAL: CREATE RELEASE KEYSTORE (DO THIS BEFORE BUILDING)

Your app is currently using a debug keystore. You MUST create a production keystore:

### Step 1: Generate Release Keystore

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore kotgep-release-key.keystore -alias kotgep-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**IMPORTANT:** 
- Save the passwords you enter somewhere SAFE (password manager recommended)
- You'll need: keystore password, key password, your name/organization info
- If you lose this keystore, you can NEVER update your app on Play Store!

### Step 2: Create gradle.properties for signing

Create `android/gradle.properties` (or add to existing) with:

```properties
KOTGEP_UPLOAD_STORE_FILE=kotgep-release-key.keystore
KOTGEP_UPLOAD_KEY_ALIAS=kotgep-key-alias
KOTGEP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
KOTGEP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

**CRITICAL:** Add this to `.gitignore` to never commit passwords!

### Step 3: Update build.gradle

Add to `android/app/build.gradle` in the `android` block:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('KOTGEP_UPLOAD_STORE_FILE')) {
            storeFile file(KOTGEP_UPLOAD_STORE_FILE)
            storePassword KOTGEP_UPLOAD_STORE_PASSWORD
            keyAlias KOTGEP_UPLOAD_KEY_ALIAS
            keyPassword KOTGEP_UPLOAD_KEY_PASSWORD
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

---

## 📋 PLAY STORE REQUIREMENTS CHECKLIST

### Required for Submission:
- [x] App name: Kotgep
- [x] Package ID: com.kotgep.app
- [x] Version: 1.0.0 (versionCode: 1)
- [x] App icon (512x512 for Play Store): kotgep-logo.png (1080x1080 ✓)
- [ ] **Release keystore configured** (MUST DO ABOVE!)
- [ ] Privacy Policy URL (required if you collect data)
- [ ] Feature Graphic (1024x500 px)
- [ ] Screenshots (minimum 2, recommend 4-8)
  - Phone: min 320px, max 3840px
  - Tablet: min 1080px, max 7680px
- [ ] App description (short & full)
- [ ] Category selection
- [ ] Content rating questionnaire
- [ ] Target audience & age selection

### Recommended Before Launch:
- [ ] Test on multiple devices
- [ ] Test installing AAB/APK
- [ ] Verify all permissions are necessary
- [ ] Add ProGuard rules if using minify
- [ ] Test offline functionality
- [ ] Check app size (<100MB recommended)

---

## 🚀 BUILD FOR PRODUCTION

### Using EAS Build (Recommended):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android --profile production
```

### Alternative: Local Build

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📱 PLAY STORE ASSETS NEEDED

### 1. Icon (DONE ✓)
- App icon: 512x512 (you have kotgep-logo.png at 1080x1080 - resize to 512x512)

### 2. Feature Graphic (REQUIRED)
- Size: 1024x500 px
- Format: PNG or JPG
- Content: App branding/key feature showcase

### 3. Screenshots (REQUIRED - minimum 2)
Recommended: 4-8 screenshots showing key features
- Capture from Android device
- Show: Home, Library, PDF reader, Events, etc.

### 4. App Description

**Short Description (80 chars max):**
"Kotgep - Kosovo Turkish Youth Platform Magazine Reader"

**Full Description:**
Write compelling description about:
- What the app does
- Key features (magazine library, events, announcements)
- Why users should download it
- Include keywords naturally

---

## ⚠️ IMPORTANT NOTES

1. **Package Name CANNOT be changed** after first upload to Play Store
2. **Keep your keystore safe** - backup in multiple secure locations
3. **Version Code** must increase with each release (currently 1)
4. **Target SDK**: Make sure to target latest Android API (check Play Store requirements)
5. **Privacy Policy**: Required if collecting user data (check Supabase usage)
6. **Test thoroughly** before submitting

---

## 🔧 FINAL CHECKS BEFORE SUBMISSION

```bash
# 1. Clean build
cd android && ./gradlew clean

# 2. Build release
./gradlew bundleRelease

# 3. Check AAB size
ls -lh app/build/outputs/bundle/release/

# 4. Verify signing
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab

# 5. Test install
bundletool build-apks --bundle=app-release.aab --output=app.apks --mode=universal
bundletool install-apks --apks=app.apks
```

---

## 📞 SUPPORT

- Play Console: https://play.google.com/console
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Android Publishing: https://developer.android.com/studio/publish

---

**Last Updated:** December 7, 2025
**App Version:** 1.0.0
**Package:** com.kotgep.app
