import { Request, Response, NextFunction } from "express";
import { AppError } from "../@types/AppError";

export default notFoundMiddleware;

function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction) {
    const err = <AppError>Error("not found");
    err.status = 404;
    return next(err);
}
