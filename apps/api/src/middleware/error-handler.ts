import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthError, ValidationError } from '../auth/errors.js';

export interface ErrorHandlerOptions {
  /** Controls whether unexpected errors are logged with a stack trace. */
  isProduction: boolean;
  logger?: Pick<Console, 'error'>;
}

export const notFoundHandler: RequestHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' },
  });
};

/**
 * Single place where errors become responses, so every route reports failures in the same shape:
 *
 *   { "error": { "code": "...", "message": "...", "details": [...] } }
 */
export function errorHandler({ isProduction, logger = console }: ErrorHandlerOptions): ErrorRequestHandler {
  return (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
      return;
    }

    // Malformed JSON bodies surface as a SyntaxError from the body parser. That is a client
    // error, not a server fault, so it must not be reported as a 500.
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        error: { code: 'MALFORMED_JSON', message: 'The request body is not valid JSON.' },
      });
      return;
    }

    logger.error('Unhandled error while serving request', error);

    // Internal failure details are never returned to the caller: messages and stack traces
    // routinely leak connection strings, file paths, and query fragments.
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction
          ? 'An unexpected error occurred.'
          : `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  };
}
