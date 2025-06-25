# Sales Management Mobile Application README

## Overview

This is a comprehensive mobile application built with React Native and Expo, designed to manage sales, prizes, and user claims. The application is structured to support three distinct user roles: Admin, Biller, and User, each with a specific set of permissions and functionalities. The backend is powered by Firebase, utilizing its Authentication and Firestore services.

## Features

- **User Authentication:** Secure user registration and login system.
- **Role-Based Access Control:** Different dashboards and functionalities for Admin, Biller, and User roles.
- **Admin Dashboard:**
  - Manage users
  - Add, edit, and view items
  - Add, edit, and view sales
  - Manage claims (view details, update status)
  - Manage prizes (add, edit, view)
- **Biller Dashboard:**
  - Add and view sales
  - Manage items
  - Handle claims
- **User Dashboard:**
  - View personal rewards and points
  - Claim prizes
- **Real-time Data Sync:** Firestore ensures that all data is up-to-date across all devices.

## Tech Stack

- **Frontend:**
  - React Native
  - Expo
  - Expo Router for file-based routing
- **Backend:**
  - Firebase Authentication
  - Firebase Firestore
- **Styling:**
  - Standard React Native stylesheets
- **State Management:**
  - React Context API (`AuthContext`)

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo CLI
- Android Studio or Xcode for emulators/simulators

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd sales-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Firebase Setup

1.  Create a new project on the [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Authentication** (Email/Password).
3.  Set up **Firestore** and define your security rules in `firestore.rules`.
4.  Obtain your Firebase project's configuration and place it in a secure file. For this project, you'll need the `google-services.json` for Android.
5.  Make sure your `firestore.rules` are deployed to your Firebase project.

### Running the App

1.  **Start the development server:**
    ```bash
    npx expo start
    ```
2.  **Run on an emulator or physical device:**
    - Press `a` to run on an Android emulator.
    - Press `i` to run on an iOS simulator.
    - Scan the QR code with the Expo Go app on your physical device.

## Folder Structure

```
sales/
├── app/
│   ├── admin/         # Admin-specific screens
│   ├── biller/        # Biller-specific screens
│   ├── user/          # User-specific screens
│   ├── components/    # Shared components
│   ├── contexts/      # React contexts (e.g., AuthContext)
│   ├── _layout.tsx    # Main layout
│   ├── index.tsx      # Entry point/Home screen
│   ├── login.jsx      # Login screen
│   └── signup.jsx     # Signup screen
├── assets/            # Images, fonts, etc.
├── package.json       # Project dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## User Roles

- **Admin:** Has full control over the application, including user management, item and sale management, and prize administration.
- **Biller:** Responsible for recording sales and managing items. Can also process user claims.
- **User:** The end-user of the application who can view their rewards and claim prizes based on their accumulated points.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
