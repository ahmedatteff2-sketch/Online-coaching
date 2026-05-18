export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const BadRequest = (message = 'Bad request', details?: unknown) =>
  new HttpError(400, message, details);
export const Unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const Forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const NotFound = (message = 'Not found') => new HttpError(404, message);
export const Conflict = (message = 'Conflict') => new HttpError(409, message);
export const Unprocessable = (message = 'Unprocessable', details?: unknown) =>
  new HttpError(422, message, details);
