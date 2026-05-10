import rateLimit from "express-rate-limit";

function rateLimitMessage(message: string) {
  return { error: { code: "TOO_MANY_REQUESTS", message } };
}

// Login: 20 attempts per 15 minutes (per IP + email)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: rateLimitMessage("Demasiados intentos de login. Intenta de nuevo en 15 minutos."),
  standardHeaders: true,
  legacyHeaders: false,
  // Do not count successful logins against the limit.
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identifier = req.body?.email || "unknown";
    return `login-${req.ip}-${identifier}`;
  },
  validate: { xForwardedForHeader: false, default: false },
});

// Email lookup (used by login UX): higher throughput for frontend autocompletion.
export const lookupEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: rateLimitMessage("Demasiadas consultas de email. Intenta de nuevo en unos minutos."),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  keyGenerator: (req) => {
    const identifier = req.body?.email || "unknown";
    return `lookup-email-${req.ip}-${identifier}`;
  },
});

// Register: 10 attempts per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: rateLimitMessage("Demasiados intentos de registro. Intenta de nuevo en 1 hora."),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  keyGenerator: (req) => {
    const identifier = req.body?.email || "unknown";
    return `register-${req.ip}-${identifier}`;
  },
});

// Forgot password: 3 attempts per hour per email
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: rateLimitMessage("Demasiadas solicitudes de recuperación. Intenta de nuevo en 1 hora."),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  keyGenerator: (req) => {
    const identifier = req.body?.email || "unknown";
    return `forgot-${req.ip}-${identifier}`;
  },
});

// Reset password: 5 attempts per hour
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: rateLimitMessage("Demasiados intentos de reset. Intenta de nuevo en 1 hora."),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
});

// General API: 300 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: rateLimitMessage("Demasiadas solicitudes. Intenta de nuevo más tarde."),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
});
