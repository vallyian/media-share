import { Request, Response, NextFunction } from "express";
import { Logger } from "../../@types/Logger";

export class ErrorMiddleware {
    constructor(
        private readonly logger: Logger,
        private readonly config: {
            NODE_ENV: string
        }
    ) { }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- last arg required by express to correctly interpret as error middleware
    handler(err: Error, req: Request, res: Response, _next: NextFunction) {
        const status = err.status || 500;
        const url = req.url;
        const safeErr = {
            message: err.message || "internal server error",
            status,
            stack: (err.stack || "")
                .replace(err.message, "")
                .split(/\n/g)
                .filter(l => !!l.trim() && !/[\\/]node_modules[\\/]|\(node:internal\//.test(l)),
            hostname: req.hostname,
            method: req.method,
            url: req.url,
            headers: (() => {
                ["authorization", "cookie"].forEach(h => req.headers[h] && delete req.headers[h] && (req.headers[`${h}`] = "omitted"));
                return req.headers;
            })()
        };

        if (!url.endsWith(".map"))
            this.logger.error(safeErr);

        res.status(status)
            .header("Content-Type", "text/plain")
            .send(this.config.NODE_ENV !== "development" ? safeErr.message : [safeErr.message, "", ...safeErr.stack].join("\n"));
    }
}
