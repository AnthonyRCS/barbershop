export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public payload?: unknown;

  constructor(code: string, statusCode: number, message?: string, payload?: unknown) {
    super(message ?? code);
    this.code = code;
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export class HttpError extends AppError {
  constructor(statusCode: number, code: string, message?: string) {
    super(code, statusCode, message);
  }
}
