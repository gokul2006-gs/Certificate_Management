import jwt from "jsonwebtoken";
import { cookieOptions, env } from "../config/env.js";

export function signSession(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function setSessionCookie(res, payload) {
  res.cookie(env.cookieName, signSession(payload), cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(env.cookieName, { ...cookieOptions(), maxAge: 0 });
}

export function readSession(req) {
  const token = req.cookies?.[env.cookieName];
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

export function requireAuth(roles = []) {
  return (req, res, next) => {
    const session = readSession(req);
    if (!session) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (roles.length && !roles.includes(session.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    req.sessionUser = session;
    return next();
  };
}

export const requireAdmin = requireAuth(["admin"]);
export const requireStudent = requireAuth(["student"]);
export const requireAnyUser = requireAuth(["admin", "student"]);
