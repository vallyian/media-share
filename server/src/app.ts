import path from "node:path";

import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";

import { IdTokenAdapter } from "./@types/Auth";
import consts from "./consts";
import env from "./env";
import infrastructure from "./infrastructure";
import healthMiddleware from "./middleware/health.middleware";
import faviconMiddleware from "./middleware/favicon.middleware";
import authMiddlewareFactory from "./middleware/auth.middleware";
import videoFileMiddleware from "./middleware/video-file.middleware";
import subtitleFileMiddleware from "./middleware/subtitle-file.middleware";
import dirIndexMiddleware from "./middleware/dir-index.middleware";
import notFoundMiddleware from "./middleware/not-found.middleware";
import errorMiddleware from "./middleware/error.middleware";

const app: express.Application = express();

export default {
    app,
    initApp
};

async function initApp(di = infrastructure) {
    Object.entries(di).forEach(([injectionToken, injectionObj]) => app.set(injectionToken, injectionObj));

    app.set("x-powered-by", false);
    app.use(rateLimit({
        windowMs: env.RATE_LIMIT_MINUTES * 60 * 1000,
        max: env.RATE_LIMIT_COUNTER
    }));
    app.use((csp => helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrcElem: ["'self'", ...(csp.flatMap(c => c.scriptSrcElem || []))],
            connectSrc: ["'self'", ...(csp.flatMap(c => c.connectSrc || []))],
            frameSrc: ["'self'", ...(csp.flatMap(c => c.frameSrc || []))],
        }
    }))((<IdTokenAdapter[]>Object.values(app.get("idTokenAdapters"))).map(a => a.csp)));
    app.use(compression());

    app.set("view engine", "ejs");
    app.set("views", env.NODE_ENV === "development" ? path.join("src", "views") : "views");

    app.set("media", "media");

    app.use("/health", healthMiddleware);
    app.use("/favicon.ico", faviconMiddleware);
    app.use(express.static(path.join(app.get("views"), "scripts")));

    app.use(cookieParser(env.COOKIE_PASS), authMiddlewareFactory());
    app.use(videoFileMiddleware, subtitleFileMiddleware);
    app.use(express.static(consts.mediaDir), dirIndexMiddleware);

    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
