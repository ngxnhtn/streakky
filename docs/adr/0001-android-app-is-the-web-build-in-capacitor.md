# Android app is the web build wrapped in Capacitor

Streakky ships on Android as the same React web build running inside Capacitor, not as a React Native/Expo app or a Trusted Web Activity. Screens are built once with DOM, Tailwind and Radix in `packages/ui`: React Native would have meant rebuilding every screen, and a Trusted Web Activity would have left reminders weak and local data open to browser eviction.

## Consequences

Anything that needs native Android APIs goes through Capacitor plugins or our own native code: local notifications, native Google sign-in, on-device storage, and the home-screen widget. The widget can't run inside the WebView, so it is native Android code that needs a way to receive streak data from the web app.
