import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
          err: Error,
          req: Request,
          res: Response,
          next: NextFunction
) => {
          console.error('[ERROR]', err.message);

          const customErrors: Record<string, number> = {
                    'EMAIL_SEND_FAILED': 503,
          };

          const statusCode = customErrors[err.message] || 500;
          res.status(statusCode).json({
                    success: false,
                    error: err.message,
          });
};