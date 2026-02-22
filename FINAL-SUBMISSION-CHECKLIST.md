# ✅ FINAL GOOGLE PLAY SUBMISSION CHECKLIST
**Date:** December 7, 2025  
**App:** Kotgep  
**Package:** com.kotgep.app  
**Version:** 1.0.0

---

## 🟢 COMPLETED & VERIFIED

### ✅ App Metadata
- [x] **App Name:** Kotgep (consistent across all files)
- [x] **Package ID:** com.kotgep.app (changed from com.anonymous.GencKalemlerMobilApp)
- [x] **Bundle ID (iOS):** com.kotgep.app
- [x] **Version:** 1.0.0
- [x] **Version Code:** 1
- [x] **App Slug:** kotgep

### ✅ Icons & Assets
- [x] **App Icon:** kotgep-logo.png (1080x1080, 183KB) ✓
- [x] **Splash Screen:** Using kotgep-logo.png ✓
- [x] **Android Icons:** Generated via expo prebuild (webp format in all densities) ✓
- [x] **Adaptive Icon:** Configured with kotgep-logo.png ✓

### ✅ Android Configuration
- [x] **AndroidManifest.xml:** Clean, proper permissions
- [x] **strings.xml:** App name set to "Kotgep"
- [x] **build.gradle:** Package ID, version correct
- [x] **Permissions:** Scoped to Android 12 and below (maxSdkVersion=32)
- [x] **allowBackup:** Set to false (security best practice)
- [x] **Orientation:** Portrait mode set
- [x] **Deep Linking:** Configured (exp+kotgep)

### ✅ Build Configuration
- [x] **Release Signing:** Configured in build.gradle (needs keystore creation)
- [x] **Minify Enabled:** Yes, for smaller app size
- [x] **Shrink Resources:** Enabled for optimization
- [x] **ProGuard:** Configured
- [x] **Hermes Engine:** Enabled (better performance)
- [x] **New Architecture:** Enabled (React Native's new architecture)

---

## 🔴 CRITICAL - MUST DO BEFORE BUILDING

### 1. Create Release Keystore (REQUIRED!)

```bash
cd /Users/melihtakyaci/Documents/Dergi/GencKalemlerMobilApp/android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore kotgep-release-key.keystore \
  -alias kotgep-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**You will be asked for:**
- Keystore password (create a strong one!)
- Key password (can be same as keystore)
- Your name
- Organization: Kotgep or your organization name
- City, State, Country code

### 2. Configure Keystore in gradle.properties

Add these lines to `/android/gradle.properties`:

```properties
KOTGEP_UPLOAD_STORE_FILE=kotgep-release-key.keystore
KOTGEP_UPLOAD_KEY_ALIAS=kotgep-key-alias
KOTGEP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD_HERE
KOTGEP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD_HERE
```

⚠️ **CRITICAL:** 
- Backup this keystore file in 3+ safe locations
- Store passwords in a password manager
- If you lose this, you can NEVER update your app!

### 3. Update Expo Packages (Recommended)

```bash
npx expo install --check
```

This will update 6 packages to latest patch versions.

---

## 📋 GOOGLE PLAY CONSOLE REQUIREMENTS

### Required Assets (Must Prepare):

#### 1. App Icon for Store
- **Size:** 512x512 px
- **Format:** PNG (32-bit)
- **Action Needed:** Resize kotgep-logo.png from 1080x1080 to 512x512

```bash
# Using ImageMagick (if installed):
convert src/assets/kotgep-logo.png -resize 512x512 kotgep-icon-512.png

# Or use online tool: https://www.iloveimg.com/resize-image
```

#### 2. Feature Graphic (REQUIRED)
- **Size:** 1024x500 px
- **Format:** PNG or JPG
- **Content:** App branding, key features showcase
- **Action:** Create this graphic (use Canva, Figma, or design tool)

#### 3. Screenshots (Minimum 2, Recommended 4-8)
- **Phone:** Min 320px on short side, max 3840px on long side
- **Recommended:** 1080x1920 or 1080x2400 (modern phone aspect ratios)
- **Action:** Take screenshots of:
  - Home screen with magazine covers
  - PDF reader view
  - Library screen
  - Events/announcements screen

#### 4. App Description

**Short Description (80 chars max):**
```
Kosovo Turkish Youth Platform - Magazine reader and events
```

**Full Description (4000 chars max):**
```
Kotgep - Kosovo Turkish Youth Platform

Access the latest magazines, articles, and announcements from the Kosovo Turkish Youth Platform directly from your mobile device.

KEY FEATURES:
📖 Digital Magazine Library - Read all published magazines
📱 Offline Reading - Download and read offline
📅 Events & Announcements - Stay updated with latest events
🔔 Real-time Updates - Get notified of new content

ABOUT KOTGEP:
Kosovo Turkish Youth Platform (Kotgep) is dedicated to empowering Turkish youth in Kosovo through education, culture, and community engagement. Our mobile app brings our content directly to your fingertips.

Download now and stay connected with the Kotgep community!
```

#### 5. Privacy Policy
- **Required:** If you collect ANY user data
- **Your App Uses:** Supabase (check what data is collected)
- **Action:** Create privacy policy page or URL
- **Free Tools:** 
  - https://www.privacypolicygenerator.info/
  - https://app-privacy-policy-generator.firebaseapp.com/

#### 6. Content Rating
- **Action:** Complete the questionnaire in Play Console
- **Typical:** PEGI 3 / Everyone (if no sensitive content)

#### 7. App Category
- **Suggested:** News & Magazines OR Education
- **Action:** Select in Play Console

#### 8. Target Audience
- **Action:** Select appropriate age range
- **Suggested:** All ages OR 13+

---

## 🚀 BUILD & SUBMIT PROCESS

### Option 1: EAS Build (Recommended - Easiest)

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to Expo account
eas login

# 3. Build production AAB
eas build --platform android --profile production

# 4. Wait for build to complete (cloud-based)
# You'll get a download link when ready

# 5. Download the .aab file
# 6. Upload to Google Play Console
```

### Option 2: Local Build

```bash
# 1. Ensure keystore is configured (see above)

# 2. Clean previous builds
cd android
./gradlew clean

# 3. Build release AAB
./gradlew bundleRelease

# 4. Find your AAB at:
# android/app/build/outputs/bundle/release/app-release.aab

# 5. Verify it's signed correctly
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab

# Should see: "jar verified"
```

---

## 🔍 PRE-SUBMISSION TESTING

### Test on Real Device:
```bash
# 1. Build APK for testing
cd android && ./gradlew assembleRelease

# 2. Install on device
adb install app/build/outputs/apk/release/app-release.apk

# 3. Test thoroughly:
- [ ] App opens without crashes
- [ ] All screens load properly
- [ ] PDF reading works
- [ ] Download functionality works
- [ ] Events/announcements display
- [ ] Navigation works smoothly
- [ ] App icon displays correctly
- [ ] Splash screen shows properly
```

### Check App Size:
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Should be < 100MB (recommended)
# If larger, consider enabling more optimizations
```

---

## ⚠️ KNOWN ISSUES & WARNINGS

### 1. Multiple Lock Files
**Warning from expo-doctor:**
- You have both `yarn.lock` and `package-lock.json`
- **Fix:** Remove one (keep the one you use)

```bash
# If you use npm:
rm yarn.lock

# If you use yarn:
rm package-lock.json
```

### 2. Package Version Mismatches
**6 packages slightly outdated** (patch versions):
- expo: 54.0.25 → 54.0.27
- expo-build-properties: 1.0.9 → 1.0.10
- expo-dev-client: 6.0.18 → 6.0.20
- expo-file-system: 19.0.19 → 19.0.20
- expo-splash-screen: 31.0.11 → 31.0.12
- expo-status-bar: 3.0.8 → 3.0.9

**Fix:**
```bash
npx expo install --check
```

### 3. Native Folders Warning
- You have android/ios folders AND native config in app.json
- This is OK, but be aware: EAS Build won't auto-sync some properties
- **Current Setup:** Using Prebuild (correct)

---

## 📝 GOOGLE PLAY CONSOLE SUBMISSION STEPS

1. **Go to:** https://play.google.com/console
2. **Create App:**
   - App name: Kotgep
   - Default language: Turkish (or English)
   - App type: App
   - Free or Paid: Free

3. **Upload AAB:**
   - Production → Create new release
   - Upload your .aab file
   - Release name: 1.0.0
   - Release notes: "Initial release of Kotgep mobile app"

4. **Complete Store Listing:**
   - App name: Kotgep
   - Short description: [See above]
   - Full description: [See above]
   - App icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - Screenshots: 2-8 phone screenshots
   - Category: News & Magazines
   - Contact email: [Your email]
   - Privacy policy URL: [Your URL]

5. **Content Rating:**
   - Complete questionnaire
   - Most likely: PEGI 3 / Everyone

6. **Pricing & Distribution:**
   - Countries: Select all or specific (Kosovo, Turkey, etc.)
   - Pricing: Free
   - Contains ads: No (unless you have ads)

7. **Submit for Review:**
   - Review all sections (must be green checkmarks)
   - Click "Send for review"
   - Wait 1-7 days for approval

---

## 🎯 FINAL CHECKLIST BEFORE SUBMIT

### Technical:
- [ ] Release keystore created and secured
- [ ] Keystore credentials in gradle.properties
- [ ] AAB/APK builds successfully
- [ ] App installs and runs on test device
- [ ] All features work correctly
- [ ] No crashes or critical bugs
- [ ] App size is reasonable (<100MB)
- [ ] Version code is 1, version name is 1.0.0

### Store Listing:
- [ ] App icon 512x512 created
- [ ] Feature graphic 1024x500 created
- [ ] At least 2 screenshots captured
- [ ] Short description written (<80 chars)
- [ ] Full description written
- [ ] Privacy policy created (if needed)
- [ ] Content rating completed
- [ ] Category selected
- [ ] Pricing & distribution set

### Legal:
- [ ] Privacy policy complies with GDPR (if applicable)
- [ ] You have rights to all content/images
- [ ] App complies with Google Play policies
- [ ] Contact information is correct

---

## 📞 SUPPORT & RESOURCES

- **Play Console:** https://play.google.com/console
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Android Publishing Guide:** https://developer.android.com/studio/publish
- **Play Policy Center:** https://play.google.com/about/developer-content-policy/

---

## ✅ CURRENT STATUS

**✅ Your app is technically ready for submission!**

**Next immediate steps:**
1. Create release keystore (5 minutes)
2. Add credentials to gradle.properties (2 minutes)
3. Build AAB with EAS or locally (10-30 minutes)
4. Create store graphics (30-60 minutes)
5. Take screenshots (15 minutes)
6. Upload to Play Console (20 minutes)

**Estimated time to submit:** 2-3 hours

**Good luck with your launch! 🚀**

---

**Last verified:** December 7, 2025  
**App version:** 1.0.0 (1)  
**Package:** com.kotgep.app
