# EasyChatWeb

A real-time chat web application with automatic language translation, built with the MERN stack (MongoDB, Express, React, Node.js), Socket.IO, and a modern UI.

## About
EasyChatWeb lets users chat in real time, automatically translates messages to each user's preferred language, and provides a beautiful, responsive interface. It is designed for easy deployment on free platforms like Railway (backend), Vercel (frontend), and MongoDB Atlas (database).

## Features
- 🔒 User authentication (signup, login, JWT)
- 💬 Real-time messaging with Socket.IO
- 🌐 Automatic message translation (MyMemory API)
- 🏷️ Unread message badges and notifications
- 🖼️ Profile picture upload (Cloudinary)
- 🗣️ User preferred language selection
- 🟢 Online user status
- 🧑‍💻 Modern, responsive UI (React + Tailwind CSS)
- 🆓 100% free to deploy (Railway, Vercel, MongoDB Atlas)

## Tech Stack
- **Frontend:** React, Zustand, Tailwind CSS, Vite
- **Backend:** Node.js, Express, Socket.IO, Mongoose
- **Database:** MongoDB Atlas (free tier)
- **Translation:** MyMemory API
- **Image Upload:** Cloudinary

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/slmaher/EasyChatWeb.git
cd EasyChatWeb
```

### 2. Setup the Backend
```bash
cd backend
npm install
# Create a .env file with your secrets (see below)
npm run dev
```
#### Example `.env` for backend
```
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### 3. Setup the Frontend
```bash
cd ../frontend
npm install
# Create a .env file with your API URL (see below)
npm run dev
```
#### Example `.env` for frontend
```
VITE_API_URL=http://localhost:5001 # or your deployed backend URL
```

## Running Locally
- Start the backend: `cd backend && npm run dev`
- Start the frontend: `cd frontend && npm run dev`
- Visit `http://localhost:5173` in your browser

## Deployment

### Backend (Railway)
1. Push your code to GitHub.
2. Go to [Railway](https://railway.app/), create a new project, and link your repo.
3. Set your environment variables in Railway.
4. Deploy!

### Frontend (Vercel)
1. Go to [Vercel](https://vercel.com/), import your repo, and select the frontend folder.
2. Set `VITE_API_URL` to your Railway backend URL.
3. Deploy!

### Database (MongoDB Atlas)
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas/database).
2. Whitelist your Railway backend IP or allow all IPs for testing.
3. Use the connection string in your backend `.env`.



---
**Happy chatting!**