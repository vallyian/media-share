import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { healthMiddleware } from "./middleware/health.middleware";
import { favicon, appScript } from "./middleware/static.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { routeMiddleware } from "./middleware/route.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { routes } from "./routes";
import { env } from "./env";

let app: express.Application;

export function makeApp(): express.Application {
    if (app) return app;

    app = express();

    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrcElem: ["'self'", "https://accounts.google.com/gsi/client"],
            connectSrc: ["'self'", "https://accounts.google.com/"],
            frameSrc: ["'self'", "https://accounts.google.com/"]
        }
    }));
    app.disable("X-Powered-By");
    app.use(cookieParser(env.COOKIE_PASS));

    app.set("view engine", "ejs");
    app.set("views", env.VIEWS_DIR);

    app.use(routes.health, healthMiddleware);
    app.use(routes.favicon, favicon);
    app.use(routes.appScripts, appScript);
    app.use(authMiddleware);
    app.use(routeMiddleware);
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
