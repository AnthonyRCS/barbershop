import bcrypt from "bcryptjs";

const COMMON_PASSWORDS = [
  "password", "12345678", "qwerty", "abc123", "monkey", "1234567", "letmein",
  "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine", "ashley",
  "bailey", "passw0rd", "shadow", "123123", "654321", "superman", "qazwsx",
  "michael", "football", "password1", "welcome", "jesus", "ninja", "mustang",
  "password123", "admin", "hello", "starwars", "whatever", "donald", "batman",
  "zaq1zaq1", "qwertyuiop", "freedom", "princess", "solo", "charlie", "access",
  "flower", "ranger", "jordan", "buster", "jennifer", "hunter",
  "tigger", "cookie", "robert", "thomas", "hockey", "daniel",
  "klaster", "112233", "george", "computer", "michelle", "jessica",
  "pepper", "1111", "zxcvbnm", "555555", "11111111", "131313",
  "777777", "pass", "maggie", "159753", "aaaaaa", "ginger",
  "joshua", "cheese", "amanda", "summer", "love", "nicole",
  "chelsea", "matthew", "yankees", "987654321",
  "dallas", "austin", "thunder", "taylor", "matrix", "william",
  "hello", "martin", "heather", "secret", "merlin", "diamond",
];

export async function hashPassword(password: string, saltRounds = 12): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): {
  isValid: boolean;
  score: number;
  strength: string;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  const minLength = password.length >= 8;
  if (!minLength) {
    errors.push("Debe tener mínimo 8 caracteres");
  } else {
    score += 20;
  }

  const hasUppercase = /[A-Z]/.test(password);
  if (!hasUppercase) {
    errors.push("Debe contener al menos una mayúscula");
  } else {
    score += 20;
  }

  const hasLowercase = /[a-z]/.test(password);
  if (!hasLowercase) {
    errors.push("Debe contener al menos una minúscula");
  } else {
    score += 20;
  }

  const hasNumber = /\d/.test(password);
  if (!hasNumber) {
    errors.push("Debe contener al menos un número");
  } else {
    score += 20;
  }

  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/~`]/.test(password);
  if (!hasSymbol) {
    errors.push("Debe contener al menos un símbolo (!@#$%^&*...)");
  } else {
    score += 20;
  }

  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  const isValid = minLength && hasUppercase && hasLowercase && hasNumber && hasSymbol;

  return {
    isValid,
    score: Math.min(score, 100),
    strength: score < 40 ? "débil" : score < 70 ? "media" : "fuerte",
    errors,
  };
}

export function isCommonPassword(password: string): boolean {
  if (!password) return false;
  return COMMON_PASSWORDS.includes(password.toLowerCase());
}

export async function validatePasswordHistory(
  newPassword: string,
  historyHashes: string[]
): Promise<boolean> {
  if (!historyHashes || historyHashes.length === 0) return true;
  for (const hash of historyHashes) {
    const matches = await comparePassword(newPassword, hash);
    if (matches) return false;
  }
  return true;
}

export function validatePasswordComplete(
  password: string,
  options: { checkCommon?: boolean; minScore?: number } = {}
): { isValid: boolean; score: number; strength: string; errors: string[] } {
  const { checkCommon = true, minScore = 60 } = options;

  const validation = validatePassword(password);
  const errors = [...validation.errors];

  if (checkCommon && isCommonPassword(password)) {
    errors.push("Esta contraseña es muy común y no es segura");
    validation.isValid = false;
  }

  if (validation.score < minScore) {
    errors.push(`La contraseña debe tener una fortaleza mínima de ${minScore}/100`);
    validation.isValid = false;
  }

  return {
    isValid: validation.isValid && errors.length === 0,
    score: validation.score,
    strength: validation.strength,
    errors,
  };
}
