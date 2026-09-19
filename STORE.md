# TrooperPing — App Store / Play Store notes

## Accounts

| Platform | Cost | Link |
|----------|------|------|
| Google Play Console | **$25** one-time registration | https://play.google.com/console/signup |
| Apple Developer Program | **$99**/year | https://developer.apple.com/programs/ |

Android is first. Ship an AAB to Play; iOS Capacitor shell can follow later.

## v1 architecture (this repo)

- Capacitor Android project loads the **live Cloud/web URL** in a WebView:
  - Production: `https://trooper-ping.onrender.com/`
- Config: `capacitor.config.ts` → `server.url` + `allowNavigation` for
  `trooper-ping.onrender.com` and Stripe (`stripe.com` / `*.stripe.com`).
- Local `www/` is only a fallback shell asset for `npx cap sync`; the app does
  **not** ship a static Next.js export for v1.
- **Do not change** the Next.js Render deploy (`npm run build` / `render.yaml`).
  Mobile is a thin shell around the same hosted web app.

## Important: subscriptions / IAP

- **Google Play and App Store require In-App Purchases (IAP)** for digital
  subscriptions sold inside the mobile apps.
- **Stripe Checkout remains for the web** (and for allowing navigation to Stripe
  during checkout in the WebView for now).
- Before monetizing subscriptions *inside* the store apps, replace or gate
  Stripe subscription purchase flows with Play Billing / StoreKit (or a
  compliant wrapper). Shipping paid digital subscriptions via Stripe-only
  inside the store APK/IPA risks rejection or removal.

## Privacy policy (placeholder)

Play and App Store listings need a privacy policy URL covering:

- Location data (locate-me / map)
- Account / email if collected
- Payment processor (Stripe on web; IAP on store later)
- Crash / analytics if added later

**TODO:** Host a real policy (e.g. `/privacy` on the Render site) and paste the
URL into Play Console → App content → Privacy policy.

Suggested draft outline only — replace with counsel-reviewed text before launch:

> TrooperPing shows crowd-sourced highway LEO sightings. We may process precise
> or approximate location when you use locate-me, and account/payment data when
> you subscribe. We do not sell personal data. Contact: [YOUR EMAIL].

## Build release AAB (Android App Bundle)

On a machine with **JDK 17+** and **Android SDK** (Android Studio recommended):

```bash
cd /path/to/trooper-ping
npm install
npx cap sync android
cd android
./gradlew bundleRelease
```

Output (typical):

`android/app/build/outputs/bundle/release/app-release.aab`

Upload that AAB in Play Console → Production (or Internal testing first).

### Signing

- Create an upload keystore (keep it offline; never commit `*.jks` / `*.keystore`).
- Configure signing in `android/app/build.gradle` or via Android Studio
  **Generate Signed Bundle**.
- Enroll in Play App Signing so Google holds the app signing key.

### Debug / open project

```bash
npm run cap:sync
npm run cap:open:android   # opens Android Studio
```

## Icons

Source PNGs live in `public/icons/` (`icon-192.png`, `icon-512.png`). They are
copied into Android mipmap resources where practical; regenerate adaptive icons
in Android Studio for a polished store listing.

## Permissions (AndroidManifest)

- `INTERNET` — load the live site
- `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` — browser/Capacitor geolocation for locate-me
- Cleartext HTTP disabled (`usesCleartextTraffic` false / `cleartext: false`)

## Blockers / machine requirements

Release builds are **not** produced on the Render host. You need locally (or CI):

- JDK 17+
- Android Studio + Android SDK (API level matching the Capacitor Android project)
- Optional: physical device or emulator for QA

If `java` / `ANDROID_HOME` are missing, `./gradlew bundleRelease` will fail until those are installed.
