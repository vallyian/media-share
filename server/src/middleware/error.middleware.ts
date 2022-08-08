import { Request, Response, NextFunction } from "express";

import { AppError } from "../@types/AppError";
import { env } from "../env";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- last arg required by express to correctly interpret as error middleware
export function errorMiddleware(err: AppError, req: Request, res: Response, _next: NextFunction) {
    const body = req.body;
    if (body instanceof Object) {
        if (body.password) body.password = "...omitted...";
        if (body.passwordRepeat) body.passwordRepeat = "...omitted...";
    }

    const errJson = {
        status: err.status || 500,
        message: err.message || "internal server error",
        stack: (err.stack || "").split(/\n/g).filter(l => !!l.trim()),
        hostname: req.hostname,
        method: req.method,
        url: req.url,
        headers: (() => {
            if (req.headers.authorization) req.headers.authorization = "...omitted...";
            if (req.headers.cookie) req.headers.cookie = "...omitted...";
            return req.headers;
        })(),
        body,
    };

    console.error(errJson);

    return res
        .status(errJson.status)
        .send(env.NODE_ENV === "development"
            ? err.stack || err.message
            : err.message);
}
