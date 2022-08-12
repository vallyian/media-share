import { NextFunction, Request, Response } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library";

import { env } from "../env";
import * as renderService from "../services/render.service";
import * as cryptoService from "../services/crypto.service";
import * as sanitizeService from "../services/sanitize.service";

type AccessToken = Pick<TokenPayload, "email">;

const accessTokenCookieName = "access_token";

export const authMiddleware = [verifyAccessToken, verifyIdToken, notAuthorized];

function verifyAccessToken(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.signedCookies[accessTokenCookieName];
    if (!accessToken) return next();

    return Promise.resolve()
        .then(() => cryptoService.decrypt(accessToken))
        .then(decrypted => {
            const token: AccessToken = JSON.parse(decrypted);
            if (!token.email) return Promise.reject("invalid access token email");
            if (!env.G_EMAILS.includes(token.email)) return Promise.reject("email not authorized");
            // populate req.user if required
            return next();
        })
        .catch(err => {
            console.error(err);
            return res.status(403).end();
        });
}

function verifyIdToken(req: Request, res: Response, next: NextFunction) {
    const idToken = sanitizeService.queryParams(req).credential;
    if (!idToken) return next();

    const redirect = sanitizeService.queryParams(req).redirect;

    return Promise.resolve()
        .then(() => new OAuth2Client(env.G_CLIENT_ID).verifyIdToken({
            idToken,
            audience: env.G_CLIENT_ID,
        }))
        .then(ticket => ticket.getPayload()
            || Promise.reject("id token payload is undefined"))
        .then(idToken => idToken
            ? getAccessToken(idToken)
            : Promise.reject("invalid id token"))
        .then(accessToken => res
            .cookie(accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
            .redirect(redirect))
        .catch(err => {
            console.error(err);
            return res.status(403).end();
        });
}

export function notAuthorized(_req: Request, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => renderService.renderPage("auth", { gClientId: env.G_CLIENT_ID }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).status(401).end(data))
        .catch(err => next(err));
}

function getAccessToken(idToken: TokenPayload): Promise<string> {
    return Promise.resolve()
        .then(() => {
            if (!idToken.email_verified) return Promise.reject("id token email not verified");
            if (!idToken.email) return Promise.reject("invalid id token email");
            if (!env.G_EMAILS.includes(idToken.email)) return Promise.reject("email not authorized");
            return {
                email: idToken.email
            };
        })
        .then((at: AccessToken) => cryptoService.encrypt(JSON.stringify(at)));
}
