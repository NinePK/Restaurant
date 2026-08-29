import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_in_production";

export interface JWTUser extends JWTPayload {
  id: string;
  username: string;
  role: string;
  permissions?: string[];
}

const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: Omit<JWTUser, keyof JWTPayload>): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<JWTUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as JWTUser;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "restaurant_session";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 8, // 8 hours
  path: "/",
};
