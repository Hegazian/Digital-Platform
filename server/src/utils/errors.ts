export class AppError extends Error {
  constructor(public statusCode: number, public message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code?: string) {
    super(409, message, code);
  }
}
