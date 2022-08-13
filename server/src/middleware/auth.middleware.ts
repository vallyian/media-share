import { NextFunction, Request, Response } from "express";

import { env } from "../env";
import * as renderService from "../services/render.service";
import * as sanitizeService from "../services/sanitize.service";
import * as authService from "../services/auth.service";


const accessTokenCookieName = "access_token";

export const authMiddleware = [verifyAccessToken, getAccessToken, getIdToken];

function verifyAccessToken(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.signedCookies[accessTokenCookieName];
    if (!accessToken) return next();

    return Promise.resolve()
        .then(() => authService.getAccessTokenPayload(accessToken))
        .then((/* accessTokenPayload */) => {
            // populate req.user if required
            return next();
        })
        .catch(err => {
            console.error(err);
            return res.status(403).end();
        });
}

function getAccessToken(req: Request, res: Response, next: NextFunction) {
    const idToken = sanitizeService.queryParams(req).credential;
    if (!idToken) return next();

    const redirect = sanitizeService.queryParams(req).redirect;

    return Promise.resolve()
        .then(() => authService.getIdTokenPayload(idToken))
        .then(idToken => authService.getAccessToken(idToken))
        .then(accessToken => res
            .cookie(accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
            .redirect(redirect))
        .catch(err => {
            console.error(err);
            return res.status(403).end();
        });
}

export function getIdToken(_req: Request, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => renderService.renderPage("auth", { gClientId: env.G_CLIENT_ID }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).status(401).end(data))
        .catch(err => next(err));
}
