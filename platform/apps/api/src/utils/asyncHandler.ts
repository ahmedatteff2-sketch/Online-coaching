import type { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  <P = any, ResB = any, ReqB = any, ReqQ = any>(
    fn: (
      req: Request<P, ResB, ReqB, ReqQ>,
      res: Response<ResB>,
      next: NextFunction,
    ) => Promise<unknown>,
  ): RequestHandler<P, ResB, ReqB, ReqQ> =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
