import express from "express";
import { AppError } from "../@types/AppError";
import config from "../config";

export default errorMiddleware;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- last arg required by express to correctly interpret as error middleware
function errorMiddleware(err: AppError, req: express.Request, res: express.Response, _next: express.NextFunction) {
    const errJson = {
        status: err.status || 500,
        message: err.message || "internal server error",
        stack: (err.stack || "").split(/\n/g).filter(l => !!l.trim()),
        hostname: req.hostname,
        method: req.method,
        url: req.url,
        headers: (() => {
            if (req.headers.authorization) {
                delete req.headers.authorization;
                req.headers["x-authorization-omitted"] = "...";
            }
            if (req.headers.cookie) {
                delete req.headers.cookie;
                req.headers["x-cookie-omitted"] = "...";
            }
            return req.headers;
        })()
    };

    console.error(errJson);

    return res
        .status(errJson.status)
        .send(config.NODE_ENV === "development"
            ? err.stack || err.message
            : err.message);
}
