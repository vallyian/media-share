import path from "node:path";

import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";

import { env } from "./env";
import { routes } from "./routes";
import { healthMiddleware } from "./middleware/health.middleware";
import { mediaInfoMiddleware } from "./middleware/media-info.middleware";
import { faviconMiddleware } from "./middleware/favicon.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { videoFileMiddleware } from "./middleware/video-file.middleware";
import { subtitleFileMiddleware } from "./middleware/subtitle-file.middleware";
import { dirIndexMiddleware } from "./middleware/dir-index.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

let app: express.Application;

export function makeApp(): express.Application {
    if (app) return app;

    app = express();

    app.use(rateLimit({
        windowMs: env.RATE_LIMIT_MINUTES * 60 * 1000,
        max: env.RATE_LIMIT_COUNTER
    }));
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrcElem: ["'self'", "https://accounts.google.com/gsi/client"],
            connectSrc: ["'self'", "https://accounts.google.com/"],
            frameSrc: ["'self'", "https://accounts.google.com/"]
        }
    }));
    app.set("x-powered-by", false);
    app.use(compression());

    app.use(routes.health, healthMiddleware);
    app.use(express.static(path.join(env.VIEWS_DIR, "scripts")));
    app.use(cookieParser(env.COOKIE_PASS));
    app.set("view engine", "ejs");
    app.set("views", env.VIEWS_DIR);

    app.use(mediaInfoMiddleware);
    app.use(routes.favicon, faviconMiddleware);

    app.use(authMiddleware);

    app.use(dirIndexMiddleware);
    app.use(videoFileMiddleware);
    app.use(subtitleFileMiddleware);
    app.use(express.static(env.MEDIA_DIR));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
