import { NextFunction, Request, Response } from "express";

export function HealthRoute() {
    return handler;

    function handler(_req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(200).end("healthy");
        } catch (ex) {
            return next(ex);
        }
    }
}
