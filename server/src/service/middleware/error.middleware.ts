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
        const omitted = "*omitted*";
        let url = req.url;
        if (url.indexOf("id_token=") >= 0) {
            const urlObj = new URL(url);
            if (urlObj.searchParams.get("id_token")) {
                urlObj.searchParams.set("id_token", omitted);
                url = urlObj.toString();
            }
        }

        const safeErr = {
            message: err.message || "internal server error",
            stack: (stack => Array.isArray(stack) && stack.length === 1 ? stack[0] : stack)((err.stack || "")
                .split(/\n/g)
                .map(l => l.replace(err.message, "").trim())
                .filter(l => !!l && !/(?:[\\/]node_modules[\\/]|\(node:internal\/|^Error:$)/.test(l))),
            method: req.method,
            url,
            status,
            headers: (() => {
                ["authorization", "cookie"].forEach(h => req.headers[h] && delete req.headers[h] && (req.headers[`${h}`] = omitted));
                return req.headers;
            })()
        };

        if (!url.endsWith(".map"))
            logger.error(safeErr);

        res.status(status)
            .header("Content-Type", "text/plain")
            .send(config.NODE_ENV !== "development" ? safeErr.message : [safeErr.message, "", ...(Array.isArray(safeErr.stack) ? safeErr.stack : [safeErr.stack])].join("\n"));
    }
}
