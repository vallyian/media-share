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
import healthRoute from "./routes/health.route";
import faviconRoute from "./routes/favicon.route";
import authMiddlewareFactory from "./middleware/auth.middleware";
import videoFileMiddleware from "./middleware/video-file.middleware";
import subtitleFileMiddleware from "./middleware/subtitle-file.middleware";
import dirIndexMiddleware from "./middleware/dir-index.middleware";
import notFoundMiddleware from "./middleware/not-found.middleware";
import errorMiddleware from "./middleware/error.middleware";
import fsService from "./services/fs.service";

const app: express.Application = express();

export default {
    app,
    initApp
};

async function initApp(di = infrastructure) {
    if (app.get("init")) return app;
    app.set("init", true);

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

    app.use(env.PROXY_LOCATION, (proxiedApp => {
        proxiedApp.set("view engine", "ejs");
        proxiedApp.set("views", env.NODE_ENV === "development" && fsService.statSync("src") === "dir" ? path.join("src", "views") : "views");
        proxiedApp.use("/health", healthRoute);
        proxiedApp.use("/favicon.ico", faviconRoute);
        proxiedApp.use(express.static(path.join(proxiedApp.get("views"), "scripts")));
        proxiedApp.use(cookieParser(env.COOKIE_PASS), authMiddlewareFactory());
        proxiedApp.use(videoFileMiddleware);
        proxiedApp.use(subtitleFileMiddleware);
        proxiedApp.use(express.static(consts.mediaDir, { dotfiles: "allow" }));
        proxiedApp.use(dirIndexMiddleware);
        return proxiedApp;
    })(express()));

    app.use(notFoundMiddleware);

    app.use(errorMiddleware);

    return app;
}
