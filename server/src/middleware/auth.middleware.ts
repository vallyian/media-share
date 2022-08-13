import { NextFunction, Request, Response } from "express";

import { env } from "../env";
import * as renderService from "../services/render.service";
import * as sanitizeService from "../services/sanitize.service";
import * as authService from "../services/auth.service";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const accessTokenCookieName = "access_token";

    const accessToken = req.signedCookies[accessTokenCookieName];
    if (accessToken)
        return Promise.resolve()
            .then(() => authService.getAccessTokenPayload(accessToken))
            .then((/* accessTokenPayload */) => {
                // populate req.user if required
                return next();
            })
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    const idToken = sanitizeService.queryParams(req).credential;
    if (idToken)
        return Promise.resolve()
            .then(() => authService.getIdTokenPayload(idToken))
            .then(idToken => authService.getAccessToken(idToken))
            .then(accessToken => res
                .cookie(accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
                .redirect(sanitizeService.queryParams(req).redirect))
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    return Promise.resolve()
        .then(() => renderService.renderPage("auth", { gClientId: env.G_CLIENT_ID }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).status(401).end(data))
        .catch(err => next(err));
}
