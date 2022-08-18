import { NextFunction, Request, Response } from "express";

import { IdTokenAdapter, IdTokenPayload } from "../@types/Auth";
import { env } from "../env";
import { app } from "../app";
import * as cryptoService from "../services/crypto.service";

type AccessTokenPayload = Pick<IdTokenPayload, "email">;

export function authMiddlewareFactory() {
    return authMiddleware;
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const accessTokenCookieName = "access_token";
    // TODO: logic to find used adapter
    const adapter: IdTokenAdapter = app.get("idTokenAdapters")["google"];

    const accessToken = req.signedCookies[accessTokenCookieName];
    if (accessToken)
        return Promise.resolve()
            .then(() => getAccessTokenPayload(accessToken))
            .then((/* accessTokenPayload; populate req.user if required */) => next())
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    const idToken = typeof req.query["id_token"] === "string" ? <string>req.query["id_token"] : "";
    if (idToken)
        return Promise.resolve()
            .then(() => getIdTokenPayload(idToken, adapter))
            .then(idToken => getAccessToken(idToken))
            .then(accessToken => res
                .cookie(accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
                .redirect(typeof req.query["redirect"] === "string" ? new URL(req.query["redirect"], `${req.protocol}://${req.get("host")}`).href : "/"))
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    return res.setHeader("Content-type", "text/html").status(401).end(adapter.html);
}

async function getIdTokenPayload(idToken: string, adapter: IdTokenAdapter) {
    const payload = await adapter.getIdTokenPayload(idToken, env.AUTH_CLIENT);
    if (!payload?.email) return Promise.reject("id token email missing");
    if (!payload.email_verified) return Promise.reject("id token email not verified");
    if (!env.AUTH_EMAILS.includes(payload?.email)) return Promise.reject("email not authorized");
    return <IdTokenPayload>payload;
}

async function getAccessToken(idToken: IdTokenPayload): Promise<string> {
    const accessTokenPayload: AccessTokenPayload = {
        email: idToken.email
    };
    const accessTokenString = JSON.stringify(accessTokenPayload);
    const accessTokenEncrypted = await cryptoService.encrypt(accessTokenString);
    return accessTokenEncrypted;
}

function getAccessTokenPayload(accessToken: string): Promise<AccessTokenPayload> {
    return Promise.resolve()
        .then(() => cryptoService.decrypt(accessToken))
        .then(decrypted => <AccessTokenPayload>JSON.parse(decrypted))
        .then(token => {
            if (!token.email) return Promise.reject("invalid access token email");
            if (!env.AUTH_EMAILS.includes(token.email)) return Promise.reject("email not authorized");
            return token;
        });
}
