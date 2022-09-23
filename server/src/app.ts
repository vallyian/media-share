import path from "node:path";

import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";

import { IdTokenAdapter } from "./@types/Auth";
import { CryptoAdapter } from "./@types/CryptoAdapter";
import config from "./config";
import healthRoute from "./routes/health.route";
import faviconRoute from "./routes/favicon.route";
import mediaSyncRoute from "./routes/media-sync.route";
import authMiddlewareFactory from "./middleware/auth.middleware";
import videoFileMiddleware from "./middleware/video-file.middleware";
import subtitleFileMiddleware from "./middleware/subtitle-file.middleware";
import dirIndexMiddleware from "./middleware/dir-index.middleware";
import notFoundMiddleware from "./middleware/not-found.middleware";
import errorMiddleware from "./middleware/error.middleware";
import fsService from "./services/fs.service";

export default async function initApp(infrastructure: {
    idTokenAdapters: Record<string, IdTokenAdapter>,
    cryptoAdapter: CryptoAdapter
}) {
    const app: express.Application = express();

    app.set("x-powered-by", false);

    app.use(rateLimit({
        windowMs: config.RATE_LIMIT_MINUTES * 60 * 1000,
        max: config.RATE_LIMIT_COUNTER
    }));

    app.use((csp => helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrcElem: ["'self'", ...(csp.flatMap(c => c.scriptSrcElem || []))],
            connectSrc: ["'self'", ...(csp.flatMap(c => c.connectSrc || []))],
            frameSrc: ["'self'", ...(csp.flatMap(c => c.frameSrc || []))],
        }
    }))(Object.values(infrastructure.idTokenAdapters).map(a => a.csp)));

    app.use(compression());

    app.use(config.PROXY_LOCATION, (proxiedApp => {
        proxiedApp.set("view engine", "ejs");
        proxiedApp.set("views", config.NODE_ENV === "development" && fsService.statSync("src") === "dir" ? path.join("src", "views") : "views");
        proxiedApp.get("/health", healthRoute);
        proxiedApp.get("/favicon.ico", faviconRoute);
        proxiedApp.use(express.static(path.join(proxiedApp.get("views"), "scripts")));
        proxiedApp.use(cookieParser(config.COOKIE_PASS), authMiddlewareFactory(infrastructure.idTokenAdapters, infrastructure.cryptoAdapter));
        proxiedApp.post("/api/media-sync", mediaSyncRoute);
        proxiedApp.use(videoFileMiddleware);
        proxiedApp.use(subtitleFileMiddleware);
        proxiedApp.use(express.static(config.mediaDir, { dotfiles: "allow" }));
        proxiedApp.use(dirIndexMiddleware);
        return proxiedApp;
    })(express()));

    app.use(notFoundMiddleware);

    app.use(errorMiddleware);

    return app;
}
