import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
}

export async function pingDb() {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    throw new Error("MongoDB is not connected");
  }
  await mongoose.connection.db.admin().command({ ping: 1 });
  return {
    status: "connected",
    message: `Connected to ${mongoose.connection.name}`,
    host: mongoose.connection.host,
  };
}
