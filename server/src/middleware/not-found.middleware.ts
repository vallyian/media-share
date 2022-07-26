import { Request, Response, NextFunction } from "express";

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction) {
    const err = Error("not found");
    err.status = 404;
    return next(err);
}
