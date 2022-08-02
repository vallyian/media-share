import express from "express";
import helmet from "helmet";

import { healthMiddleware } from "./middleware/health.middleware";
import { pathMiddleware } from "./middleware/path.middleware";
import { dirIndexMiddleware } from "./middleware/dir-index.middleware";
import { postStaticMiddleware, preStaticMiddleware } from "./middleware/file-handler.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { routes } from "./routes";

let app: express.Application;

export function makeApp(): express.Application {
    if (app) return app;

    app = express();

    app.use(helmet());
    app.disable("X-Powered-By");
    app.set("view engine", "ejs");
    app.set("views", "src/views");
    app.use(routes.health, healthMiddleware);
    app.use(pathMiddleware);
    app.use(dirIndexMiddleware);
    app.use(preStaticMiddleware);
    app.use(express.static("media"));
    app.use(postStaticMiddleware);
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
