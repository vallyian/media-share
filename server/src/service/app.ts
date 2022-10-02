import fs from "node:fs";
import express, { Application, Request, Response, NextFunction } from "express";
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
import { NotFoundMiddleware } from "./middleware/not-found.middleware";
import { ErrorMiddleware } from "./middleware/error.middleware";

export class App {
    readonly app: Application;

    constructor(
        private readonly logger: Logger,
        private readonly domain: Domain,
        private readonly config: {
            NODE_ENV: string,
            authClient: string,
            authEmails: string[],
            rateLimitMinutes: number,
            rateLimitCounter: number,
            proxyLocation: string,
            cookieSecret: string,
            mediaDir: string
        }
    ) {
        this.app = this.createApp();
    }

    private createApp() {
        const app = express();
        app.set("x-powered-by", false);
        app.use(rateLimit({
            windowMs: this.config.rateLimitMinutes * 60 * 1000,
            max: this.config.rateLimitCounter
        }));
        if (this.config.authClient && this.config.authEmails.length)
            app.use((csp => helmet.contentSecurityPolicy({
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrcElem: ["'self'"].concat(csp.scriptSrcElem),
                    connectSrc: ["'self'"].concat(csp.connectSrc),
                    frameSrc: ["'self'"].concat(csp.frameSrc),
                }
            }))(this.domain.idTokenService.csp()));
        app.use(compression());
        app.use(this.config.proxyLocation, this.createProxiedApp());
        app.use((req, res, next) => new NotFoundMiddleware().handler(req, res, next));
        app.use((err: Error, req: Request, res: Response, next: NextFunction) => new ErrorMiddleware(this.logger, this.config).handler(err, req, res, next));
        return app;
    }

    private createProxiedApp() {
        const app = express();
        app.set("view engine", "ejs");
        app.set("views", fs.existsSync("src/service/views") ? "src/service/views" : "service/views");
        app.get("/health", (req, res) => new HealthRoute().handler(req, res));
        app.get("/favicon.ico", (req, res, next) => new FaviconRoute().handler(req, res, next));
        app.use(express.static(`${app.get("views")}/css`));
        app.use(express.static(`${app.get("views")}/scripts`));
        app.use(cookieParser(this.config.cookieSecret));
        if (this.config.authClient && this.config.authEmails.length)
            app.use((req, res, next) => new AuthMiddleware(this.domain.idTokenService, this.domain.accessTokenService).handler(req, res, next));
        app.use((req, res, next) => new DirIndexMiddleware(this.domain.mediaAccessService).handler(req, res, next));
        app.use((req, res, next) => new MediaPlayerFileMiddleware(this.domain.mediaAccessService).handler(req, res, next));
        app.use((req, res, next) => new SubtitleFileMiddleware(this.domain.mediaAccessService, this.domain.subtitleService).handler(req, res, next));
        app.use(express.static(this.config.mediaDir, { dotfiles: "allow" }));
        return app;
    }
}
