import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const color =
      res.statusCode >= 500 ? '\x1b[31m' :
      res.statusCode >= 400 ? '\x1b[33m' :
      res.statusCode >= 300 ? '\x1b[36m' :
      '\x1b[32m';

    console.log(
      `${color}${req.method}\x1b[0m ${req.path} ${color}${res.statusCode}\x1b[0m ${duration}ms`
    );
  });

  next();
};