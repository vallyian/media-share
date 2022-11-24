import fs from "node:fs";
import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";

import { Logger } from "../@types/Logger";
import { Domain } from "../domain";

import { HealthRoute } from "./routes/health.route";
import { FaviconRoute } from "./routes/favicon.route";

import { AuthMiddleware } from "./middleware/auth.middleware";
import { MediaPlayerFileMiddleware } from "./middleware/media-player.middleware";
import { SubtitleFileMiddleware } from "./middleware/subtitle-file.middleware";
import { DirIndexMiddleware } from "./middleware/dir-index.middleware";
import { WebdavMiddleware } from "./middleware/webdav.middleware";
import { NotFoundMiddleware } from "./middleware/not-found.middleware";
import { ErrorMiddleware } from "./middleware/error.middleware";

export function App(
    logger: Logger,
    domain: Domain,
    config: {
        NODE_ENV: string,
        authClient: string,
        authEmails: string[],
        authDav: string[],
        rateLimitMinutes: number,
        rateLimitCounter: number,
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
        app.use((req, _res, next) => (req.reqId = ++reqId, next()));
        app.use(rateLimit({
            windowMs: config.rateLimitMinutes * 60 * 1000,
            max: config.rateLimitCounter
        }));
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
        app.use((req, _res, next) => (req.reqId = ++reqId, next()));
        app.use(rateLimit({
            windowMs: config.rateLimitMinutes * 60 * 1000,
            max: config.rateLimitCounter
        }));
        if (config.authClient && config.authEmails.length)
            app.use((csp => helmet.contentSecurityPolicy({
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrcElem: ["'self'"].concat(csp.scriptSrcElem),
                    connectSrc: ["'self'"].concat(csp.connectSrc),
                    frameSrc: ["'self'"].concat(csp.frameSrc),
                }
            }))(domain.idTokenService.csp()));
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
            app.use(track("auth").in, AuthMiddleware(domain.idTokenService, domain.accessTokenService), track("auth").out);
        }
        app.use(track("dir-index").in, DirIndexMiddleware(domain.mediaAccessService), track("dir-index").out);
        app.use(track("media-player").in, MediaPlayerFileMiddleware(domain.mediaAccessService), track("media-player").out);
        app.use(track("subtitle").in, SubtitleFileMiddleware(domain.mediaAccessService, domain.subtitleService), track("subtitle").out);
        app.use(track("static-media").in, express.static(config.mediaDir, { dotfiles: "allow" }), track("static-media").out);
        return app;
    }

    function track(route: string) {
        const log = logger.info;
        return {
            in: (req: Request, _res: Response, next: NextFunction) => (log(new Date(), req.reqId, req.url, "-->", route), next()),
            out: (req: Request, _res: Response, next: NextFunction) => (log(new Date(), req.reqId, req.url, "   ", route, "-->"), next()),
        };
    }
}
