# Play Store Readiness Audit
**Project:** Kotgep Mobile App (GencKalemlerMobilApp)
**Audit Date:** 2026-02-22
**Status:** ❌ NOT READY — Critical issues must be resolved first

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 3 | Must fix before release |
| 🟠 High | 5 | Must fix before release |
| 🟡 Medium | 4 | Should fix before release |
| 🟢 Low | 3 | Nice to have |

---

## 🔴 CRITICAL ISSUES

### 1. Hardcoded Supabase Credentials
**File:** `src/services/supabase.ts:5-6`

```ts
const SUPABASE_URL = 'https://jjygunxzboqsruwyenay.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Risk:** Anyone who decompiles the APK or reads the source code can extract and abuse your Supabase project — reading/writing to the database, exhausting your quota, or data exfiltration.

**Fix Steps:**
1. Rotate the key immediately in Supabase Dashboard → Settings → API
2. Create a `.env` file (already in `.gitignore` as `.env*.local`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://jjygunxzboqsruwyenay.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-new-rotated-key
   ```
3. Update `src/services/supabase.ts`:
   ```ts
   const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
   const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
   ```
4. For EAS builds add via: `eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."`

> **Note:** The anon key being public is not inherently a security risk for Supabase — it's designed to be used client-side. However, it should not be hardcoded in source control. The real protection is Row Level Security (RLS) policies in Supabase. Verify RLS is enabled on all tables.

---

### 2. Hardcoded Keystore Credentials in Version Control
**File:** `android/gradle.properties:68-71`

```properties
KOTGEP_UPLOAD_STORE_FILE=kotgep-release-key.keystore
KOTGEP_UPLOAD_KEY_ALIAS=kotgep-key-alias
KOTGEP_UPLOAD_STORE_PASSWORD=kotgep2024secure
KOTGEP_UPLOAD_KEY_PASSWORD=kotgep2024secure
```

**Risk:** Anyone with access to the repository can sign apps with your identity, push malicious updates, or impersonate your app on the Play Store.

**Important:** `android/gradle.properties` IS listed in `.gitignore` (line 25), but the file shows as tracked (`M`) in git status, meaning it was committed before the gitignore rule was added. The credentials are in git history.

**Fix Steps:**
1. Remove the credentials from `gradle.properties`:
   ```properties
   # (leave these lines out — do NOT commit credentials)
   ```
2. Create `android/keystore.properties` (already ignored by `.gitignore:24`):
   ```properties
   KOTGEP_UPLOAD_STORE_FILE=kotgep-release-key.keystore
   KOTGEP_UPLOAD_KEY_ALIAS=kotgep-key-alias
   KOTGEP_UPLOAD_STORE_PASSWORD=kotgep2024secure
   KOTGEP_UPLOAD_KEY_PASSWORD=kotgep2024secure
   ```
3. In `android/app/build.gradle`, load from that file:
   ```groovy
   def keystorePropertiesFile = rootProject.file("keystore.properties")
   def keystoreProperties = new Properties()
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```
4. Consider rotating the keystore password (you cannot change the keystore itself once used for Play Store).
5. Remove the sensitive data from git history: `git filter-branch` or BFG Repo Cleaner.

---

### 3. Network Inspector Enabled in Production
**File:** `android/gradle.properties:58`

```properties
EX_DEV_CLIENT_NETWORK_INSPECTOR=true
```

**Risk:** Enables a development-only network traffic inspector in production builds. This can expose request details, headers, and payloads.

**Fix:** Change to:
```properties
EX_DEV_CLIENT_NETWORK_INSPECTOR=false
```

---

## 🟠 HIGH ISSUES

### 4. R8/ProGuard Minification Disabled
**File:** `android/app/build.gradle:69`

```groovy
def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()
```

`android.enableMinifyInReleaseBuilds` is not set in `gradle.properties`, so it defaults to `false`. This means:
- Release APK is NOT minified or obfuscated
- Code is trivially reversible
- APK size is larger than necessary

**Fix:** Add to `android/gradle.properties`:
```properties
android.enableMinifyInReleaseBuilds=true
```

---

### 5. Console Statements in Production Code

All `console.log`, `console.debug`, `console.error`, and `console.warn` calls should be stripped or conditionally disabled in production builds.

| File | Lines | Statement |
|------|-------|-----------|
| `src/screens/HomeScreen.tsx` | ~63, ~76, ~115, ~118 | console.debug, console.warn, console.log |
| `src/screens/LibraryScreen.tsx` | ~70, ~102, ~119 | console.log, console.error |
| `src/screens/ReadEventScreen.tsx` | ~31, ~42, ~45 | console.error, console.log |
| `src/screens/PdfReaderScreen.tsx` | ~156, ~173, ~216, ~252, ~266 | console.log, console.error |
| `src/components/WeatherHeader.tsx` | ~117 | console.error |
| `src/services/fetchAnnouncements.ts` | ~29, ~35 | console.error, console.debug |
| `src/services/fetchLatestMagazine.ts` | ~22 | console.error |

**Fix Option A (Recommended) — Babel plugin:**
```bash
npm install --save-dev babel-plugin-transform-remove-console
```
In `babel.config.js`:
```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
```

**Fix Option B — Manual review:**
Replace production-relevant errors with a logger service that is silent in production.

---

### 6. Missing app.json Metadata Required for Play Store
**File:** `app.json`

Missing fields:
- `android.versionCode` — required, must increment for every Play Store upload
- `android.permissions` — document what permissions are needed and why
- Privacy policy URL — required by Google Play

**Fix:**
```json
{
  "expo": {
    "android": {
      "package": "com.kotgep.app",
      "versionCode": 1,
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```
Add a privacy policy page on your website and link it in the Play Console.

---

### 7. eas.json Production Submit Config is Empty
**File:** `eas.json:18-20`

```json
"submit": {
  "production": {}
}
```

EAS Submit requires Android service account credentials to upload to Play Store automatically.

**Fix:**
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```
Download the service account JSON from Google Play Console → Setup → API access.

---

### 8. Hardcoded Fallback Data (Non-production behavior)
**File:** `src/screens/HomeScreen.tsx` (catch block)

```ts
setAnnouncements([
  { id: 1, title: 'Yeni eğitim programı duyuruldu', type: 'Event' },
  { id: 2, title: 'Genç Kalemler: Yazı çağrısı', type: 'Announcement' },
])
```

When the network fails, users see fake hardcoded announcements instead of a real error state.

**Fix:** Show an error state UI or empty state with a retry button instead.

---

## 🟡 MEDIUM ISSUES

### 9. Scattered Hardcoded API URLs
Multiple files reference the Supabase project URL directly:

| File | Hardcoded URL |
|------|---------------|
| `src/screens/HomeScreen.tsx` | `https://jjygunxzboqsruwyenay.supabase.co/storage/v1/...` |
| `src/screens/LibraryScreen.tsx` | Same |
| `src/screens/AnnouncementDetail.tsx` | Same |
| `src/screens/PdfReaderScreen.tsx` | `https://kotgep.com/dergi/...` + Supabase URL |
| `src/components/WeatherHeader.tsx` | Supabase function URL |

**Fix:** Create `src/config/constants.ts`:
```ts
export const SUPABASE_STORAGE_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kotgepfiles`
export const PDF_STORAGE_URL = `${SUPABASE_STORAGE_BASE}/Dergi/`
export const IMAGE_STORAGE_URL = `${SUPABASE_STORAGE_BASE}/DergiKapak/`
export const WEATHER_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/weather`
```

---

### 10. gradle.properties Is Already Tracked by Git
**File:** `android/gradle.properties`

The `.gitignore` includes `android/gradle.properties` (line 25), but the file was committed before this rule was added. Git still tracks it (shown as `M` in `git status`).

**Fix:**
```bash
git rm --cached android/gradle.properties
git commit -m "stop tracking gradle.properties (contains sensitive data)"
```
After this, the file will exist locally but not be pushed to remote.

---

### 11. `expo-dev-client` in Production Dependencies
**File:** `package.json:19`

```json
"expo-dev-client": "~6.0.18"
```

`expo-dev-client` is a development tool. Having it in `dependencies` (not `devDependencies`) means it could be bundled in production builds. EAS generally handles this, but it's cleaner to move it.

**Fix:** Move to `devDependencies` or ensure EAS production builds exclude it.

---

### 12. Old Package Name Mismatch
**File:** `package.json:2`

```json
"name": "genckalemlermobilapp"
```

The app bundle ID is `com.kotgep.app` and the app name is `Kotgep`, but the npm package name still uses the old slug `genckalemlermobilapp`.

This is cosmetic but can cause confusion. Consider updating to `"name": "kotgep-mobile-app"`.

---

## 🟢 LOW ISSUES

### 13. react-navigation v5 as a Direct Dependency
**File:** `package.json:34`

```json
"react-navigation": "^5.0.0"
```

The project uses `@react-navigation/native` v7, but `react-navigation` v5 (the old API) is also listed as a direct dependency. This is likely unused and could cause version conflicts.

**Fix:** Remove `react-navigation` from dependencies.

---

### 14. minSdkVersion Inherited, Not Explicit
**File:** `android/app/build.gradle:93`

```groovy
minSdkVersion rootProject.ext.minSdkVersion
```

This inherits from `android/build.gradle`. Verify the root project sets this to at least `24` (required for Expo SDK 54).

---

### 15. No Proguard Rules File Verified
**File:** `android/app/proguard-rules.pro`

When minification is enabled (see issue #4), React Native and Supabase require specific ProGuard keep rules. Verify this file exists and contains the necessary rules.

---

## Pre-Release Checklist

### Security (Must Complete)
- [ ] Rotate Supabase anon key and move to `.env` / EAS secrets
- [ ] Move keystore credentials out of `gradle.properties` into `keystore.properties`
- [ ] Run `git rm --cached android/gradle.properties` to stop tracking it
- [ ] Clean git history of exposed credentials (BFG or `git filter-branch`)
- [ ] Set `EX_DEV_CLIENT_NETWORK_INSPECTOR=false`
- [ ] Verify Supabase Row Level Security (RLS) is enabled on all tables

### Build Configuration (Must Complete)
- [ ] Set `android.enableMinifyInReleaseBuilds=true` in `gradle.properties`
- [ ] Add `versionCode` to `app.json` android section
- [ ] Verify `minSdkVersion >= 24` in root `build.gradle`
- [ ] Verify `targetSdkVersion >= 34` (Play Store requirement as of 2024)
- [ ] Configure EAS Submit with Google service account JSON

### Code Quality (Must Complete)
- [ ] Add `babel-plugin-transform-remove-console` for production
- [ ] Replace hardcoded fallback data in `HomeScreen.tsx` with proper error UI
- [ ] Remove unused `react-navigation` v5 dependency

### Play Store Metadata (Must Complete)
- [ ] Create and publish a Privacy Policy webpage
- [ ] Write app short description (max 80 chars)
- [ ] Write app full description (max 4000 chars)
- [ ] Prepare at least 2 screenshots per device type (phone + optional tablet)
- [ ] Create a 512×512 app icon (PNG, no alpha needed for feature graphic)
- [ ] Create a 1024×500 feature graphic
- [ ] Complete content rating questionnaire in Play Console
- [ ] Declare target audience age group

### Testing (Must Complete)
- [ ] Test on a physical Android device (API 24, 29, 33, 35)
- [ ] Test offline behavior (network unavailable)
- [ ] Test PDF download and viewer
- [ ] Test all navigation flows
- [ ] Verify splash screen displays correctly
- [ ] Verify app icon appears correctly on launcher

---

## Build & Release Commands

```bash
# 1. Install dependencies
npm install

# 2. Run production build via EAS
eas build --platform android --profile production

# 3. Submit to Play Store (after configuring eas.json submit section)
eas submit --platform android --latest

# 4. Or download the AAB from EAS dashboard and upload manually via Play Console
```

---

## Files to Modify (Priority Order)

| Priority | File | Change |
|----------|------|--------|
| 1 | `src/services/supabase.ts` | Use env variables |
| 2 | `android/gradle.properties` | Remove signing credentials |
| 3 | `android/keystore.properties` | Create this file (gitignored) |
| 4 | `android/gradle.properties` | Set network inspector to false, enable minify |
| 5 | `app.json` | Add versionCode, permissions |
| 6 | `eas.json` | Add submit config |
| 7 | `babel.config.js` | Add transform-remove-console for production |
| 8 | `src/screens/HomeScreen.tsx` | Remove hardcoded fallback data |
| 9 | `src/config/constants.ts` | Create centralized API config |
| 10 | `package.json` | Remove `react-navigation` v5 |
