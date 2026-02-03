# Mobile App Instructions

We have converted your React frontend into a mobile app using **Capacitor**. This allows you to run your existing website as a native Android app.

## Prerequisites

You mentioned you have **Android Studio** installed. That is perfect.

## How to Run the App

1.  **Open the Project in Android Studio:**
    *   Open a terminal in VS Code (Ctrl+`).
    *   Run the command: `npm run android`
    *   This should execute `npx cap open android` which attempts to launch Android Studio with the correct folder.
    *   **Alternative:** Open Android Studio manually, click **"Open"**, and navigate to:
        `...\New folder\Barber\barber-saas-frontend\android`

2.  **Wait for Sync:**
    *   When Android Studio opens, you will see a loading bar at the bottom right (Gradle Sync). Wait for it to finish. It might take a few minutes the first time.

3.  **Run the App:**
    *   Look for the **Green Play Button** (▶) in the top tool bar.
    *   If no device is selected, click the dropdown next to the play button and select "Create Device" to set up an Android Emulator (a virtual phone on your screen).
    *   Click Play! The app should launch on the emulator.

## How to Update the App

Since this mobile app runs your React code, whenever you edit your components or pages (like `App.jsx`), you need to update the mobile version:

1.  Make your changes in the React code.
2.  Run this command in the terminal:
    ```bash
    npm run build
    npm run sync
    ```
3.  Click the "Run" (Play) button in Android Studio again to see the changes.

## Troubleshooting

*   **API Connection:** Your app is configured to connect to `https://barber-saas-backend-l4iz.onrender.com`. This is great because it means your mobile app will work without needing to change any complex network settings.
*   **White Screen:** If the app opens to a white screen, check the **Logcat** tab in Android Studio for errors.

## How to Share Your App for Free (No Play Store)

Publishing to the official Google Play Store costs a **one-time fee of $25**. If you want to share your app for **free** without paying Google, you can build an "APK file" and share it directly.

1.  **Open Android Studio** (run `npm run android`).
2.  In the top menu, click **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
3.  Wait for the build to finish. A popup will appear at the bottom right saying "Build APK(s): APK(s) generated successfully".
4.  Click the blue **locate** link in that popup.
5.  It will open a folder with a file named `app-debug.apk`.
6.  **Rename** this file to `BarberApp.apk`.

### How to Install it on a Phone:
1.  Send this `BarberApp.apk` file to your phone (via WhatsApp, Google Drive, or USB).
2.  Tap on the file to install it.
3.  **Note:** Since you didn't pay for the official store, your phone may say "Install unknown apps" or "Unsafe app". You just need to click "Settings" -> "Allow from this source" or "Install anyway".
