import { Request, Response, NextFunction } from "express";
import { AppError } from "../../@types/AppError";
import { Logger } from "../../@types/Logger";

export class ErrorMiddleware {
    constructor(
        private readonly logger: Logger,
        private readonly config: {
            NODE_ENV: string
        }
    ) { }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- last arg required by express to correctly interpret as error middleware
    handler(err: AppError, req: Request, res: Response, _next: NextFunction) {
        const status = err.status || 500;
        const url = req.url;

        if (!url.endsWith(".map")) {
            const errJson = {
                message: err.message || "internal server error",
                status,
                render: err.render,
                stack: (err.stack || "").split(/\n/g).filter(l => !!l.trim()).filter(l => !/(?:(?:\/|\\)node_modules(?:\/|\\)|\(node:internal\/)/.test(l)),
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
            this.logger.error(errJson);
        }

        res.status(status);

        err.render
            ? res.render(err.render.page, err.render.locals)
            : res.send(this.config.NODE_ENV === "development"
                ? err.stack || err.message
                : err.message);
    }
}
