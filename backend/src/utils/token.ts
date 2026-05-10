import crypto from "crypto";

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  if (!token || typeof token !== "string") {
    throw new Error("Token must be a non-empty string");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string, hashedToken: string): boolean {
  if (!token || !hashedToken) return false;
  return hashToken(token) === hashedToken;
}

export function generateResetToken(expirationMinutes = 60): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const token = generateToken(32);
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  return { token, hashedToken, expiresAt };
}

export function isTokenExpired(expiresAt: Date | string): boolean {
  if (!expiresAt) return true;
  const expDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expDate < new Date();
}
