import { NextFunction, Response } from "express";
import { IdTokenAdapter, IdTokenPayload } from "../@types/Auth";
import { AppRequest } from "../@types/AppRequest";
import config from "../config";
import { CryptoAdapter } from "../@types/CryptoAdapter";

let idTokenAdapters: Record<string, IdTokenAdapter>;
let cryptoAdapter: CryptoAdapter;

export default function authMiddlewareFactory(_idTokenAdapters: Record<string, IdTokenAdapter>, _cryptoAdapter: CryptoAdapter) {
    idTokenAdapters = _idTokenAdapters;
    cryptoAdapter = _cryptoAdapter;

    return authMiddleware;
}

type AccessTokenPayload = Pick<IdTokenPayload, "email">;

async function authMiddleware(req: AppRequest, res: Response, next: NextFunction) {
    const accessTokenCookieName = "access_token";
    // TODO: selection page for ID provider (sync to all cluster workers)
    const idTokenAdapter = idTokenAdapters["google"];
    if (!idTokenAdapter) return next(Error("invalid id token provider"));

    const accessToken = req.signedCookies[accessTokenCookieName];
    if (accessToken)
        return Promise.resolve()
            .then(() => getAccessTokenPayload(accessToken))
            .then((accessTokenPayload) => {
                req.user = accessTokenPayload.email;
                return next();
            })
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    const idToken = typeof req.query["id_token"] === "string" ? <string>req.query["id_token"] : "";
    if (idToken)
        return Promise.resolve()
            .then(() => getIdTokenPayload(idToken, idTokenAdapter))
            .then(idToken => getAccessToken(idToken))
            .then(accessToken => res
                .cookie(accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
                .redirect(req.path))
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    return res.status(401).render("index", {
        baseUrl: req.baseUrl,
        html: idTokenAdapter.html
    });
}

async function getIdTokenPayload(idToken: string, adapter: IdTokenAdapter) {
    const payload = await adapter.getIdTokenPayload(idToken, config.AUTH_CLIENT);
    if (!payload?.email) return Promise.reject("id token email missing");
    if (!payload.email_verified) return Promise.reject("id token email not verified");
    if (!config.AUTH_EMAILS.includes(payload?.email)) return Promise.reject("email not authorized");
    return <IdTokenPayload>payload;
}

async function getAccessToken(idToken: IdTokenPayload): Promise<string> {
    const accessTokenPayload: AccessTokenPayload = {
        email: idToken.email
    };
    const accessTokenString = JSON.stringify(accessTokenPayload);
    const accessTokenEncrypted = await cryptoAdapter.encrypt(accessTokenString);
    return accessTokenEncrypted;
}

function getAccessTokenPayload(accessToken: string): Promise<AccessTokenPayload> {
    return Promise.resolve()
        .then(() => cryptoAdapter.decrypt(accessToken))
        .then(decrypted => <AccessTokenPayload>JSON.parse(decrypted))
        .then(token => {
            if (!token.email) return Promise.reject("invalid access token email");
            if (!config.AUTH_EMAILS.includes(token.email)) return Promise.reject("email not authorized");
            return token;
        });
}
