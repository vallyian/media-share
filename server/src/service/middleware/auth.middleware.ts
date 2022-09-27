import { NextFunction, Response } from "express";
import { AppRequest } from "../../@types/AppRequest";
import { AppError } from "../../@types/AppError";
import { AccessTokenAPI } from "../../domain/ports/API/AccessToken.API";
import { IdTokenAPI } from "../../domain/ports/API/IdToken.API";

export class AuthMiddleware {
    private readonly accessTokenCookieName = "access_token";

    constructor(
        private readonly idTokenService: IdTokenAPI,
        private readonly accessTokenService: AccessTokenAPI
    ) { }

    async handler(req: AppRequest, res: Response, next: NextFunction) {
        // TODO: selection page for ID provider (sync to all cluster workers)
        const idTokenProvider = "google";

        const accessToken = req.signedCookies[this.accessTokenCookieName];
        if (accessToken)
            return this.accessTokenHandler(accessToken, req, next);

        const idToken = typeof req.query["id_token"] === "string" ? <string>req.query["id_token"] : "";
        if (idToken)
            return this.idTokenHandler(idToken, idTokenProvider, req, res, next);

        return this.loginHandler(idTokenProvider, req, next);
    }

    private accessTokenHandler(accessToken: string, req: AppRequest, next: NextFunction) {
        return this.accessTokenService.getAccessToken(accessToken)
            .then(token => {
                req.user = <string>token.email;
                return next();
            })
            .catch(err => {
                err = err instanceof Error ? err : Error(err);
                err.status = 403;
                return next(err);
            });
    }

    private idTokenHandler(idToken: string, idTokenProvider: string, req: AppRequest, res: Response, next: NextFunction) {
        return this.accessTokenService.createAccessToken(idToken, idTokenProvider)
            .then(accessToken => res
                .cookie(this.accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
                .redirect(req.path))
            .catch(err => {
                err = err instanceof Error ? err : Error(err);
                err.status = 403;
                return next(err);
            });
    }

    private loginHandler(idTokenProvider: string, req: AppRequest, next: NextFunction) {
        return this.idTokenService.html(idTokenProvider)
            .then(html => {
                const err: AppError = Error("not authorised");
                err.status = 401;
                err.render = {
                    page: "index",
                    locals: {
                        baseUrl: req.baseUrl,
                        html
                    }
                };
                return next(err);
            })
            .catch(err => next(err));
    }
}
