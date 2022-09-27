import { Request, Response, NextFunction } from "express";
import { AppError } from "../../@types/AppError";

export class NotFoundMiddleware {
    handler(_req: Request, _res: Response, next: NextFunction) {
        const err = <AppError>Error("not found");
        err.status = 404;
        return next(err);
    }
}
