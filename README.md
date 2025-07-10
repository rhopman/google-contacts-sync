# Google Contacts Sync

Google Contacts Sync is a modern Angular 20+ application for synchronizing, comparing, and managing Google Contacts between two different Google accounts. It leverages the latest Angular features—signals for state management, standalone components, and new template control flow—for a fast, reactive, and maintainable user experience.

## Features

- **Connect two Google accounts** and view their contacts side-by-side
- **Compare, sync, and manage contacts** between accounts
- **Rename, delete, and create contacts** with a clean, intuitive UI
- **Built with Angular v20+ best practices** (signals, standalone components, OnPush change detection)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm (v9+ recommended)
- Google Cloud project with OAuth 2.0 Client ID for Web (follow the [Get Ready to Use the People API](https://developers.google.com/people/v1/getting-started) instructions from Google)

### 1. Clone the Repository

To clone the repository:

```sh
git clone https://github.com/rhopman/google-contacts-sync.git
cd google-contacts-sync
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with your Google OAuth Client ID:

```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

The build process will substitute this value into the app’s environment.

### 3. Install Dependencies

```sh
npm install
```

### 4. Run the App

```sh
npm start
```

The app will be available at `http://localhost:4200`.

## Scripts

- `npm start` — Run the app in development mode
- `npm run build` — Build the app for production
- `npm test` — Run tests
- `npm run lint` — Lint and check formatting

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your fork and open a Pull Request
