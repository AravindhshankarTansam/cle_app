# CLE Attendance Mobile App (React Native)

This is a React Native mobile application built with **Expo**, tailored for Supervisors and Admin roles to securely monitor **Department Availability & Warnings** on smaller devices.

---

## Features

1. **Secure Supervisor Login**: Restricts access to department data. Only users with the role of `Supervisor`, `Manager`, or `Admin` can successfully log in.
2. **Department Availability & Warnings Dashboard**:
   - Visual progress bars showing staff turnout.
   - Dynamic **Shortage warning pills** indicating missing staff counts when the turnout falls below the minimum required department threshold.
   - Overall stats strip for quick summary.
3. **Flexible Server configuration**: Tap the settings gear/link on the login screen to configure your local backend IP. Useful for testing on physical devices!

---

## Getting Started

### 1. Prerequisites
Ensure you have Node.js installed. We recommend installing the Expo Go app on your physical iOS/Android device from the App Store / Google Play Store to preview the app easily.

### 2. Install Dependencies
Navigate to the `mobile` directory and install the packages:
```bash
cd mobile
npm install
```

### 3. Run the Development Server
Start Expo's bundler:
```bash
npm run start
```

This will launch the Expo Developer Tool in your terminal and display a QR Code.

### 4. Open the App on Devices
- **Physical Device**: Scan the terminal's QR code using the camera app (iOS) or the Expo Go app (Android).
- **iOS Simulator**: Press `i` in the terminal (macOS only).
- **Android Emulator**: Press `a` in the terminal.

---

## Server Connection Setup

The mobile app communicates with the Express backend API. By default, it looks for the server at:
`http://localhost:5000`

- **If using a Simulator/Emulator**: `localhost` will connect directly.
- **If using a Physical Device**:
  1. Make sure your phone and computer are connected to the **same Wi-Fi network**.
  2. Find your computer's local IP address (e.g. `192.168.1.5`).
  3. On the login screen, click the server configuration link at the bottom (e.g., `Server: http://localhost:5000`).
  4. Change `localhost` to your computer's local IP address and click **Save IP**.

---

## Test Accounts

The following seeded accounts can be used to log in:

| Username | Password | Role | Access |
| :--- | :--- | :--- | :--- |
| **supervisor** | `supervisor123` | Supervisor | **Granted** |
| **admin** | `admin123` | Admin | **Granted** |
| **manager** | `manager123` | Manager | **Granted** |
| **worker** | `worker123` | Worker | **Restricted (Access Denied)** |
