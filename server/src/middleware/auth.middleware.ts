import { NextFunction, Request, Response } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library";

import { env } from "../env";
import * as renderService from "../services/render.service";
import * as cryptoService from "../services/crypto.service";
import * as sanitizeService from "../services/sanitize.service";

type AccessToken = Pick<TokenPayload, "email">;

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const accessTokenCookieName = "access_token";

    const accessToken = req.signedCookies[accessTokenCookieName];
    const idToken = sanitizeService.queryParams(req).credential;
    const redirect = sanitizeService.queryParams(req).redirect;

    if (accessToken)
        return Promise.resolve()
            .then(() => verifyAccessToken(accessToken))
            .then(valid => valid
                ? next()
                : Promise.reject("invalid access token"))
            .catch(err => {
                console.error(err);
                return next(err);
            });

    if (idToken)
        return Promise.resolve()
            .then(() => verifyIdToken(idToken))
            .then(token => token
                ? getAccessToken(token)
                : Promise.reject("invalid id token"))
            .then(token => res
                .cookie(accessTokenCookieName, token, { secure: true, signed: true, httpOnly: true, sameSite: true })
                .redirect(redirect || "/"))
            .catch(err => {
                console.error(err);
                return next(err);
            });

    return Promise.resolve()
        .then(() => renderService.renderPage("auth", { gClientId: env.G_CLIENT_ID }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).status(401).end(data))
        .catch(err => next(err));
}

function verifyAccessToken(accessToken: string): Promise<AccessToken> {
    return Promise.resolve()
        .then(() => {
            if (!accessToken) return Promise.reject("invalid access token arg");
            return cryptoService.decrypt(accessToken);
        })
        .then(decrypted => JSON.parse(decrypted))
        .then((token: AccessToken) => {
            if (!token.email) return Promise.reject("invalid access token email");
            if (!env.G_EMAILS.includes(token.email)) return Promise.reject("email not authorized");
            return token;
        });
}

function verifyIdToken(idToken: string): Promise<TokenPayload> {
    return Promise.resolve()
        .then(() => new OAuth2Client(env.G_CLIENT_ID).verifyIdToken({
            idToken,
            audience: env.G_CLIENT_ID,
        }))
        .then(ticket => ticket.getPayload()
            || Promise.reject("idToken payload is undefined"));
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
