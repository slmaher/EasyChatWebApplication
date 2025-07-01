import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import blockRoutes from "./routes/block.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
const allowedOrigins = [
  "http://localhost:5173",
  "https://easy-chat-web-application.vercel.app",
  "https://easy-chat-web-application-1dwrimgwn-slmahers-projects.vercel.app"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/blocks", blockRoutes);

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
