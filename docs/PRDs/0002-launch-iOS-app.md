# iOS App Delivery Spec (Expo/EAS → Apple → TestFlight) — No Code

## Goal

Create an iOS app version of the existing web app, sharing API and auth, distributed privately to your iPhone via TestFlight (no App Store listing).

---

## Outcomes

* A native-feeling iOS app (own icon, launches from home screen).
* Over-the-air (OTA) updates via TestFlight whenever you ship a new build.
* App talks to the same cloud API as the web app (Vercel).

---

## Repo Implementation (what to add to your current web-only repo)

1. **Mobile app project**

   * Add an Expo React Native app in a sibling `apps/mobile` (or top-level `mobile`) directory.
   * Use React Native components with responsive layouts; keep business logic/API clients shared where feasible.
   * Configure environment for `API_BASE` to point at your Vercel API.

2. **Config & Identity**

   * App display name, icon set, version, build number.
   * iOS bundle identifier (reverse-DNS, unique).
   * URL scheme for deep links (needed later for OAuth).

3. **Networking**

   * All network calls go to the existing Vercel API over HTTPS.
   * No device-local DB required for MVP (use server state; add caching later if desired).

4. **Auth (if applicable)**

   * Mobile auth via your existing provider (e.g., Clerk) with native OAuth redirects using your URL scheme.
   * Reuse the same scopes and session model as web; attach auth headers to API requests.

5. **Environments**

   * Single source of truth for `API_BASE` and release channel names (e.g., preview/production).
   * Simple pattern to switch between staging and production APIs per build channel.

6. **Build profiles**

   * Define EAS build profiles for:

     * Development (optional, for local iteration with dev client).
     * Preview/Internal (ad-hoc OTA to yourself, no review).
     * Production/Store (uploads to App Store Connect for TestFlight internal testing).

---

## Admin/User Setup (what you do outside the codebase)

1. **Accounts**

   * Apple Developer Program membership (Individual or Organization).
   * Expo account (for EAS).
   * Existing Vercel project for the API.

2. **Apple IDs & team model**

   * Individual account: only your Apple ID can be an internal tester.
   * Organization account: invite teammates as internal testers through App Store Connect.
   * The Apple ID on your iPhone’s TestFlight must belong to the same App Store Connect team that owns the app.

3. **Apple assets**

   * Register the bundle identifier in Apple Developer portal.
   * Create the app record in App Store Connect (name, bundle ID, platform iOS).
   * Prepare a 1024×1024 icon and basic metadata (minimal is fine for internal testing).

4. **App Store Connect API key (for automated submissions)**

   * Generate a key (Issuer ID, Key ID, .p8 file) and store securely (EAS can reference it as a secret).

5. **EAS project linkage**

   * Log in to EAS and initialize the project for builds and submissions.
   * Allow EAS to manage iOS signing credentials (distribution certificate, provisioning profile).

6. **Environment variables & secrets**

   * Expo public runtime: API base URL(s), release channel name.
   * Keep server-side secrets (e.g., Clerk secret) in Vercel only; the mobile app should never contain server secrets.

---

## Build & Distribute (TestFlight flow)

1. **Production (store) build for TestFlight**

   * Trigger an iOS production build (store distribution).
   * Let EAS create/manage signing credentials on your Apple team.

2. **Submit to App Store Connect**

   * Submit the built artifact to App Store Connect (manual or auto-submit).
   * Wait for Apple’s processing (typically minutes). No review for internal testing.

3. **Internal testing setup**

   * In App Store Connect → TestFlight, enable Internal Testing.
   * Ensure your Apple ID is on the App Store Connect team (Individual: you by default; Organization: add user).
   * On your iPhone, install TestFlight, accept the invite, install the app.

4. **Using the app**

   * Launch from the app’s own icon on your home screen.
   * The app communicates with your Vercel API in production over HTTPS.

5. **OTA updates**

   * Increment the build number, rebuild, and resubmit to TestFlight.
   * After processing, open TestFlight on your iPhone and tap “Update.”
   * Each build remains available for 90 days; ship new builds anytime.

---

## Operational Notes & Decisions

* **No Apple review for internal testing:** Internal TestFlight builds are available after processing; external testers require Beta App Review.
* **Distribution choice:** Use TestFlight for the smoothest OTA; “internal/ad-hoc” EAS builds are also possible without TestFlight but are less streamlined for updates.
* **Release channels:** Use separate channels (preview vs production) to map to different API bases if you maintain multiple environments.
* **Performance & UX:** Aim for near-parity with the web app’s main flows; add native niceties (pull-to-refresh, gesture navigation) incrementally.
* **Future-proofing:** Keep mobile and web sharing types, API client, and domain models in a shared package where practical; keep UI layer platform-specific (RN vs React DOM) where needed.
* **Security:** All sensitive operations remain on the server (Vercel). The mobile app holds only public runtime values and user tokens obtained via your auth flow.

---

## “Definition of Done”

* iOS app installs on your iPhone via TestFlight (visible as its own icon).
* App launches without a dev server, loads production configuration, and authenticates.
* App fetches from and mutates data against your Vercel API successfully.
* You can ship a new build and update the app OTA through TestFlight without additional setup.

---

## Implementation Notes (January 2026)

### Architecture Decision: Unified Expo App

Instead of a separate mobile-only app, we chose to **replace the Next.js frontend with Expo** to maximize code reuse:

- **`apps/expo/`** builds to both **web** and **iOS** from the same codebase
- **`apps/api/`** contains only the Next.js API routes (no UI)
- **`packages/shared/`** contains shared TypeScript types

This means the web app at your Vercel domain is now served by Expo Web, not Next.js.

### Key Implementation Details

| Item | Value |
|------|-------|
| Bundle ID | `com.timtracker.app` |
| URL Scheme | `timtracker://` |
| App Name | TimTracker |
| Expo SDK | 52 |
| Clerk SDK | `@clerk/clerk-expo` v3 |

### Files Created

```
apps/expo/
├── app.json          # Expo config with bundle ID, scheme
├── eas.json          # EAS build profiles
├── app/
│   ├── _layout.tsx   # Root layout with ClerkProvider
│   ├── index.tsx     # Redirect based on auth
│   ├── sign-in.tsx   # OAuth sign-in screen
│   └── (tabs)/       # Protected tab screens
│       ├── _layout.tsx
│       ├── index.tsx         # Home
│       └── health-metrics.tsx
├── lib/
│   ├── api.ts        # API client with Bearer token
│   └── tokenCache.ts # Secure token storage for Clerk
```

### Deployment Setup

**Two Vercel projects** from the same repo:

1. **API Project**: Root directory `apps/api` → `timtracker-api.vercel.app`
2. **Web Project**: Root directory `apps/expo` → main domain

The Expo project rewrites `/api/*` requests to the API project.

### Manual Steps Required

1. **`eas login`** - One-time Expo authentication
2. **Clerk Dashboard** - Add redirect URL `timtracker://oauth-callback`
3. **TestFlight** - Install app on iPhone after build

### Build Commands

```bash
cd apps/expo && eas build --profile production --platform ios --non-interactive --auto-submit
```

EAS automatically manages Apple certificates, provisioning profiles, and App Store Connect setup.
