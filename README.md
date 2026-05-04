# CipherChat

CipherChat is a secure real-time messaging app built with the MERN stack, Socket.IO, and a privacy-first UI. It supports encrypted message envelopes, per-device keys, automatic translation, profile management, and an admin log dashboard for operational visibility.

## Overview

The app is split into two main parts:

- `frontend`: React + Vite single-page app for chat, profile, and admin screens.
- `backend`: Express + Socket.IO API that handles authentication, messaging, blocks, groups, logging, and E2EE key exchange.

The current design emphasizes security and trust. The UI uses shield/lock-style iconography, a darker control-panel feel, and clear status indicators for online state, unread messages, and blocked users.

## Core Features

- User signup, login, and JWT-based session handling.
- Real-time one-to-one chat with Socket.IO.
- End-to-end encryption using browser WebCrypto and device-specific keys.
- Message translation based on the user’s preferred language.
- Image attachments with Cloudinary uploads.
- Block and unblock users.
- Unread message counts and online presence.
- Profile photo upload and preferred language selection.
- Admin dashboard with searchable logs, filters, charts, CSV export, and log cleanup tools.

## Tech Stack

- Frontend: React, Vite, Zustand, Tailwind CSS, DaisyUI, Recharts.
- Backend: Node.js, Express, Socket.IO, Mongoose.
- Database: MongoDB.
- Media storage: Cloudinary.
- Translation: MyMemory API.
- Encryption: Browser WebCrypto for ECDH, HKDF, and AES-GCM.

## Project Structure

```text
frontend/
	src/
		components/   UI pieces such as sidebar, chat header, input, navbar
		pages/        Auth pages, home page, profile page, admin dashboard
		store/        Zustand state for auth, chat, theme, blocks, admin data
		lib/          API, utilities, and E2EE helpers
backend/
	src/
		controllers/  Route handlers for auth, chat, blocks, E2EE, logs
		routes/       Express route definitions
		models/       Mongoose schemas
		middleware/   Auth and logging middleware
		lib/          DB, socket, Cloudinary, and helpers
```

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/slmaher/EasyChatWebApplication.git
cd EasyChatWebApplication
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `backend/.env` file with:

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Run the backend:

```bash
npm run dev
```

### 3. Configure the frontend

```bash
cd ../frontend
npm install
```

Create a `frontend/.env` file with:

```env
VITE_API_URL=http://localhost:5001
```

Run the frontend:

```bash
npm run dev
```

Open the app at `http://localhost:5173`.

## Available Scripts

### Frontend

- `npm run dev`: Start the Vite dev server.
- `npm run build`: Build the production bundle.
- `npm run preview`: Preview the production build locally.
- `npm run lint`: Run ESLint.

### Backend

- `npm run dev`: Start the API with Nodemon.
- `npm start`: Start the API with Node.

## Environment Notes

- The frontend uses `VITE_API_URL` to reach the backend.
- The backend expects MongoDB and Cloudinary credentials to be present.
- Socket.IO is used for real-time status and message delivery, so both frontend and backend must be running for chat to work correctly.

## Main User Flows

### Authentication

Users can create an account, sign in, and update their profile. After authentication, the app connects to the socket server and loads the user list, unread state, and blocked-user data.

### Chatting

Selecting a contact opens a conversation. The chat view supports text and image messages, infinite scroll for older messages, translation display, and live typing indicators.

### Blocking

Users can block or unblock contacts from the chat header. Blocked users are hidden from active chat interaction and are also reflected in the sidebar.

### Profile Management

The profile page lets a user update their avatar and preferred language. That language drives translated message display.

### Admin Dashboard

The admin dashboard is available only to users whose account role is `admin`. It provides:

- Log search by message, email, and endpoint.
- Filters by type, severity, and date range.
- CSV export of the current filtered logs.
- Statistics for the selected time window.
- Severity, log type, and error trend charts.
- Cleanup tools to delete old logs.

## Security and E2EE

CipherChat uses browser-side WebCrypto for key generation and message envelope encryption. The backend stores public keys and encrypted payload metadata only; plaintext is not accepted for encrypted message flows. Each device maintains its own local encryption state, which is used to decrypt messages for that device.

## Deployment

### Backend

Deploy the backend on a Node-friendly host such as Railway, Render, or Fly.io. Make sure the environment variables from the backend `.env` are configured in the deployment platform.

### Frontend

Deploy the frontend on Vercel or another static host. Set `VITE_API_URL` to the deployed backend URL.

### Database

Use MongoDB Atlas for the database. Allow the backend host to connect to the cluster.

## Troubleshooting

- Blank page: check the browser console for runtime errors and confirm the frontend build succeeds.
- Login fails: verify `VITE_API_URL`, backend `PORT`, and the backend `.env` values.
- No messages appear: confirm both frontend and backend are running and that Socket.IO is connected.
- Encryption fails: the user must log in from each device so local device keys can be created.

## License

No explicit license is currently defined in the repository.
