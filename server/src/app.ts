import express from "express";
import helmet from "helmet";

import { env } from "./env";
import { healthMiddleware } from "./middleware/health.middleware";
import { dirIndexMiddleware } from "./middleware/dir-index.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

let app: express.Application;

export function makeApp(): express.Application {
    if (app) return app;

    app = express();

    app.use(helmet());
    app.disable("X-Powered-By");
    app.use("/health", healthMiddleware);
    // app.use(express.static(env.NODE_ENV === "development" ? "../client/dist" : "./client"));
    app.use(express.static(env.MEDIA_DIR));
    app.use(dirIndexMiddleware);
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
