import express from "express";
import helmet from "helmet";

import { env } from "./env";
import { healthMiddleware } from "./middleware/health.middleware";
import { dirIndexMiddleware } from "./middleware/dir-index.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

import { favicon } from "./services/html.service";

let app: express.Application;

export function makeApp(): express.Application {
    if (app) return app;

    app = express();

    app.use(helmet());
    app.disable("X-Powered-By");
    app.use("/health", healthMiddleware);
    app.use(express.static(env.MEDIA_DIR));
    app.use("/favicon.ico", (_req, res) => res.set("Content-Type", "image/svg+xml").end(favicon));
    app.use(dirIndexMiddleware);
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
