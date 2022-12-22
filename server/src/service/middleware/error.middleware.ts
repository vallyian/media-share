import { Request, Response, NextFunction } from "express";
import { Logger } from "../../@types/Logger";

export function ErrorMiddleware(
    logger: Logger,
    config: {
        NODE_ENV: string
    }
) {
    return handler;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- last arg required by express to correctly interpret as error middleware
    function handler(err: Error, req: Request, res: Response, _next: NextFunction) {
        const status = err.status || 500;
        const url = req.url;
        const omitted = "*omitted*";
        const safeErr = {
            message: err.message || "internal server error",
            status,
            stack: (err.stack || "")
                .split(/\n/g)
                .map(l => l.replace(err.message, "").trim())
                .filter(l => !!l && !/(?:^[\\/]node_modules[\\/]|^\(node:internal\/|^Error:$)/.test(l)),
            hostname: req.hostname,
            method: req.method,
            url: url.replace(/(.+id_token=.+\..+\.)[^&]+(&.+)?/, `$1${omitted}$2`),
            headers: (() => {
                ["authorization", "cookie"].forEach(h => req.headers[h] && delete req.headers[h] && (req.headers[`${h}`] = omitted));
                return req.headers;
            })()
        };

        if (!url.endsWith(".map"))
            logger.error(safeErr);

        res.status(status)
            .header("Content-Type", "text/plain")
            .send(config.NODE_ENV !== "development" ? safeErr.message : [safeErr.message, "", ...safeErr.stack].join("\n"));
    }
}
