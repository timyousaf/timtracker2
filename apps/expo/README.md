# TimTracker Expo App

Cross-platform app (iOS + Web) built with Expo SDK 52, React Native, and Expo Router.

## Overview

This app shares the same codebase for both iOS and web platforms. It connects to the API server (`apps/api`) for data and uses Clerk for authentication.

## Tech Stack

- **Expo SDK 52** - React Native framework
- **Expo Router v4** - File-based navigation
- **React Native Web** - Web support
- **@clerk/clerk-expo** - Authentication
- **EAS Build** - Cloud builds for iOS

## Local Development

### Prerequisites

```bash
# Install dependencies from monorepo root
cd /path/to/timtracker2
npm install
```

### Environment Variables

Create `apps/expo/.env`:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### Running Locally

```bash
# Start Expo dev server
npm run dev:expo

# Or run directly
cd apps/expo
npx expo start

# For web specifically
npx expo start --web
```

## iOS Deployment (EAS + TestFlight)

### Initial Setup (One-Time)

These steps were performed to set up iOS builds. They're documented here for reference and for setting up on a new machine.

#### 1. EAS Account Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize project (already done - project ID in app.json)
eas init
```

#### 2. Apple Developer Credentials (Manual Setup)

> **Note:** We use manual credential management because EAS CLI doesn't support hardware security keys (Yubikey) for Apple 2FA. If you have a trusted device (iPhone) as your only 2FA method, EAS can manage credentials automatically.

**Step 2.1: Create Distribution Certificate**

1. Go to [Apple Developer Portal - Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click **+** → Select **Apple Distribution** → Continue
3. Create a Certificate Signing Request (CSR):
   - Open **Keychain Access** on Mac
   - Menu: Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
   - Enter your email, leave CA Email blank, select "Saved to disk"
   - Save the `.certSigningRequest` file
4. Upload the CSR to Apple, download the `.cer` file
5. Double-click the `.cer` to install in Keychain
6. In Keychain Access → My Certificates, find "Apple Distribution", right-click → Export as `.p12`
7. Set a password for the .p12 file (you'll need it later)

**Step 2.2: Register App ID**

1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **+** → App IDs → App
2. Description: `TimTracker`
3. Bundle ID: `com.timtracker.app` (Explicit)
4. Click Register

**Step 2.3: Create Provisioning Profile**

1. Go to [Profiles](https://developer.apple.com/account/resources/profiles/list) → **+**
2. Select **App Store Connect** (under Distribution)
3. Select your App ID (`com.timtracker.app`)
4. Select your Distribution Certificate
5. Name: `TimTracker App Store`
6. Download the `.mobileprovision` file

**Step 2.4: Create credentials.json**

Create `apps/expo/credentials.json` (gitignored):

```json
{
  "ios": {
    "provisioningProfilePath": "/path/to/TimTracker_App_Store.mobileprovision",
    "distributionCertificate": {
      "path": "/path/to/YourCertificate.p12",
      "password": "your-p12-password"
    }
  }
}
```

**Step 2.5: Upload Credentials to EAS**

```bash
eas credentials
# Select: iOS → production → No (don't log in to Apple)
# Select: credentials.json: Upload/Download credentials...
# Select: Upload credentials from credentials.json to EAS
```

#### 3. App Store Connect Setup

**Step 3.1: Create App Store Connect API Key**

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Integrations → App Store Connect API
2. Click **+** to generate a new key
3. Name: `EAS Submit`, Access: `Admin`
4. Download the `.p8` file (one-time download!)
5. Note the **Key ID** and **Issuer ID**

**Step 3.2: Add API Key to EAS**

```bash
eas credentials
# Select: iOS → production → No (don't log in to Apple)
# Select: App Store Connect: Manage your API Key
# Enter path to .p8 file, Key ID, and Issuer ID
```

**Step 3.3: Create App in App Store Connect**

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Apps → **+** → New App
2. Fill in:
   - Platforms: iOS
   - Name: TimTracker
   - Primary Language: English (U.S.)
   - Bundle ID: `com.timtracker.app`
   - SKU: `timtracker`
3. Note the App ID from the URL (e.g., `6757773214`)
4. This ID is configured in `eas.json` under `submit.production.ios.ascAppId`

#### 4. Clerk Native App Configuration

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Configure → Developers → Native applications
2. Add iOS app:
   - App ID Prefix (Team ID): `L76YA8GBB4`
   - Bundle ID: `com.timtracker.app`
3. Add redirect URL: `timtracker://oauth-callback`

### Building and Submitting

After initial setup, building and submitting is simple:

```bash
cd apps/expo && eas build --profile production --platform ios --non-interactive --auto-submit
```

### Setting Up TestFlight (First Time)

After your first submission, you need to set up internal testing:

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **TimTracker** → **TestFlight**
2. Under **Internal Testing** in the left sidebar, click the **+** to create a group (e.g., "Internal Testers")
3. Add yourself to the **group** (use the same Apple ID as your iPhone)
4. The build will automatically be available - no review needed for internal testing

**Important:** Do NOT add yourself as an "Individual Tester" directly on the build page - that triggers external review which requires Apple approval.

### Installing on iPhone

1. Open **TestFlight** app on your iPhone
2. You should receive an email invitation - click to accept
3. TimTracker will appear in TestFlight
4. Tap **Install**

## Project Structure

```
apps/expo/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with ClerkProvider
│   ├── index.tsx          # Root redirect
│   ├── sign-in.tsx        # Sign-in screen
│   └── (tabs)/            # Authenticated tab screens
│       ├── _layout.tsx    # Tab navigator
│       ├── index.tsx      # Home tab
│       └── health-metrics.tsx
├── assets/                 # Icons and images
├── lib/
│   ├── api.ts             # API client with auth
│   └── tokenCache.ts      # Clerk token storage
├── app.json               # Expo config
├── eas.json               # EAS build/submit config
├── credentials.json       # Local credentials (gitignored)
└── package.json
```

## Configuration Files

### app.json

Key settings:
- `expo.scheme`: `timtracker` - URL scheme for OAuth redirects
- `expo.ios.bundleIdentifier`: `com.timtracker.app`
- `expo.extra.eas.projectId`: Links to EAS project

### eas.json

```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6757773214"
      }
    }
  }
}
```

## Troubleshooting

### EAS CLI asks for Apple login (Yubikey users)

If you have hardware security keys as your only Apple 2FA method, EAS CLI cannot authenticate. Use the manual credential setup described above.

### Build fails with missing icon

Ensure `assets/icon.png` (1024x1024), `assets/adaptive-icon.png`, and `assets/favicon.png` exist.

### OAuth redirect not working

1. Verify `timtracker://oauth-callback` is in Clerk's redirect URLs
2. Verify iOS app is registered in Clerk with correct Bundle ID and Team ID
3. Verify `expo.scheme` in app.json matches the redirect URL scheme

### Credentials expired

Distribution certificates and provisioning profiles expire after 1 year. Repeat the credential creation steps and re-upload to EAS.

## Future Updates

### OTA Updates (JavaScript/UI changes - instant)

For changes to JavaScript, React components, styles, or assets:

```bash
eas update --branch production --message "Description of changes"
```

Users get the update automatically the next time they open the app. No TestFlight interaction needed.

### Full Builds (Native changes - requires TestFlight)

For changes to native dependencies, app.json, or Expo SDK:

```bash
cd apps/expo && eas build --profile production --platform ios --non-interactive --auto-submit
```

Users open TestFlight and tap "Update" to get the new version.

### When to use which?

| Change Type | Update Method |
|-------------|---------------|
| UI/styling changes | OTA (`eas update`) |
| New screens/components | OTA (`eas update`) |
| API client changes | OTA (`eas update`) |
| New npm package (JS-only) | OTA (`eas update`) |
| New native dependency | Full build |
| app.json changes | Full build |
| Expo SDK upgrade | Full build |
