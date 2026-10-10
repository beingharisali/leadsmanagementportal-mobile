# GetCloseWise mobile app

The Android and iPhone app for Heapware Leads. It talks to the same backend
(`server/`) as the website (`client/`), so it has the same users, companies
and data.

Built with Expo (SDK 57), Expo Router, TypeScript and React Query.

## Run it on your phone

1. Install **Expo Go** from the Play Store or App Store.
2. In this folder:

   ```sh
   npm install
   npx expo start
   ```

3. Scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android.
   The phone and the computer must be on the same Wi-Fi. If they aren't, use
   `npx expo start --tunnel`.

By default the app uses the live API on Render. To use a server on your computer,
create `.env.local` with your computer's network address (not `localhost`, which is the phone itself):

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api/v1
```

## Checks

```sh
npm run typecheck
npm run lint
npx expo-doctor
```

## How it fits together

- `src/app/`: screens (Expo Router: every file is a screen, `_layout.tsx` files are navigators)
  - `(auth)/`: sign in, sign up and forgot password, shown only when signed out
  - `(app)/(tabs)/`: Home, Leads, Follow-ups, Alerts and More, shown only when signed in
- `src/lib/api-client.ts`: every API call. It sends `Authorization: Bearer <token>` and
  the app's User-Agent (`GetCloseWise/1.0.0 (Android 14; Mobile)`), which the API shows in the login history.
- `src/features/auth/auth-provider.tsx`: the sign-in. The token is kept in the phone's
  secure storage. When the API ends the session (idle sign-out, password changed…),
  the app goes back to the sign-in screen and says why.
- `src/features/app-config/`: on start-up the app asks the API (`GET /mobile/config`)
  which versions are still supported. To force everyone to update after a breaking API change,
  raise `MOBILE_MIN_VERSION` on the server.

API changes must stay backwards compatible: phones keep old versions of the app
installed for a long time.
