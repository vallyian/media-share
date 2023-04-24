/* eslint-disable @typescript-eslint/no-misused-promises */
import fs from "node:fs";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";

import { Logger } from "../@types/Logger";
import { domain } from "../domain";

import { HealthRoute } from "./routes/health.route";
import { FaviconRoute } from "./routes/favicon.route";

import { RateLimitMiddleware } from "./middleware/rate-limit.middleware";
import { AuthMiddleware } from "./middleware/auth.middleware";
import { MediaPlayerFileMiddleware } from "./middleware/media-player.middleware";
import { SubtitleFileMiddleware } from "./middleware/subtitle-file.middleware";
import { DirIndexMiddleware } from "./middleware/dir-index.middleware";
import { WebdavMiddleware } from "./middleware/webdav.middleware";
import { NotFoundMiddleware } from "./middleware/not-found.middleware";
import { ErrorMiddleware } from "./middleware/error.middleware";

export function App(
    logger: Logger,
    appDomain: ReturnType<typeof domain>,
    config: {
        NODE_ENV: string,
        authClient: string,
        authEmails: string[],
        authDav: string[],
        rateLimitPerSecond: number,
        rateLimitBurstFactor: number,
        rateLimitPeriodMinutes: number,
        proxyLocation: string,
        cookieSecret: string,
        mediaDir: string
    }
) {
    let reqId = 0;

    return {
        davApp: createDavApp(),
        webApp: createWebApp(),
    };

    function createDavApp() {
        const app = express();
        app.set("x-powered-by", false);
        app.use((req, _res, next) => { req.reqId = ++reqId; return next(); });
        app.use(...RateLimitMiddleware(config));
        app.use(compression());
        app.use(track("dav").in);
        app.use(WebdavMiddleware(config));
        app.use(track("dav").out);
        app.use(track("not-found").in, NotFoundMiddleware(), track("not-found").out);
        app.use(track("error").in, ErrorMiddleware(logger, config), track("error").out);
        return app;
    }

    function createWebApp() {
        const app = express();
        app.set("x-powered-by", false);
        app.use((req, _res, next) => { req.reqId = ++reqId; return next(); });
        app.use(...RateLimitMiddleware(config));
        if (config.authClient && config.authEmails.length)
            app.use(cspMiddleware());
        app.use(compression());
        app.use(config.proxyLocation, createProxiedApp());
        app.use(track("not-found").in, NotFoundMiddleware(), track("not-found").out);
        app.use(track("error").in, ErrorMiddleware(logger, config), track("error").out);
        return app;
    }

    function createProxiedApp() {
        const app = express();
        app.set("view engine", "ejs");
        app.set("views", fs.existsSync("src/service/views") ? "src/service/views" : "service/views");
        app.get("/health", HealthRoute());
        app.get("/favicon.ico", FaviconRoute());
        app.use(express.static(`${app.get("views")}/css`));
        app.use(express.static(`${app.get("views")}/scripts`));
        if (config.authClient && config.authEmails.length) {
            app.use(track("cookie").in, cookieParser(config.cookieSecret), track("cookie").out);
            app.use(track("auth").in, AuthMiddleware(appDomain.idTokenService, appDomain.accessTokenService), track("auth").out);
        }
        app.use(track("dir-index").in, DirIndexMiddleware(appDomain.mediaAccessService), track("dir-index").out);
        app.use(track("media-player").in, MediaPlayerFileMiddleware(appDomain.mediaAccessService), track("media-player").out);
        app.use(track("subtitle").in, SubtitleFileMiddleware(appDomain.mediaAccessService, appDomain.subtitleService), track("subtitle").out);
        app.use(track("static-media").in, express.static(config.mediaDir, { dotfiles: "allow" }), track("static-media").out);
        return app;
    }

    function cspMiddleware() {
        const csp = appDomain.idTokenService.csp();
        return helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                scriptSrcElem: ["'self'"].concat(csp.scriptSrcElem),
                connectSrc: ["'self'"].concat(csp.connectSrc),
                frameSrc: ["'self'"].concat(csp.frameSrc),
            }
        });
    }

    function track(route: string) {
        const handler = (...args: string[]) => (req: Request, _res: Response, next: NextFunction) => {
            const url = req.url.replace(/(.+id_token=.+\..+\.)[^&]+(&.+)?/, "$1omitted$2");
            logger.info(req.reqId, url, ...args);
            return next();
        };
        return {
            in: handler("-->", route),
            out: handler(route, "-->"),
        };
    }
}
