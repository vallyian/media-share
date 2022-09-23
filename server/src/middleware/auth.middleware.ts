import { NextFunction, Response } from "express";
import { IdToken, IdTokenSPI } from "../@types/IdTokenSPI";
import { AppRequest } from "../@types/AppRequest";
import config from "../config";
import { CryptoSPI } from "../@types/CryptoSPI";

let _idTokenAdapters: Record<string, IdTokenSPI>;
let _cryptoAdapter: CryptoSPI;

export default function authMiddlewareFactory(idTokenAdapters: Record<string, IdTokenSPI>, cryptoAdapter: CryptoSPI) {
    _idTokenAdapters = idTokenAdapters;
    _cryptoAdapter = cryptoAdapter;

    return authMiddleware;
}

async function authMiddleware(req: AppRequest, res: Response, next: NextFunction) {
    const accessTokenCookieName = "access_token";
    // TODO: selection page for ID provider (sync to all cluster workers)
    const idTokenAdapter = _idTokenAdapters["google"];
    if (!idTokenAdapter) return next(Error("invalid id token provider"));

    const accessToken = req.signedCookies[accessTokenCookieName];
    if (accessToken)
        return Promise.resolve()
            .then(async () => {
                const decrypted = await _cryptoAdapter.decrypt(accessToken);
                const token = <IdToken>JSON.parse(decrypted);
                if (!token.email) return Promise.reject("invalid access token email");
                if (!config.AUTH_EMAILS.includes(token.email)) return Promise.reject("email not authorized");
                return token;
            })
            .then(token => {
                req.user = <string>token.email;
                return next();
            })
            .catch(err => {
                err.status = 403;
                return next(err);
            });

    const idToken = typeof req.query["id_token"] === "string" ? <string>req.query["id_token"] : "";
    if (idToken)
        return Promise.resolve()
            .then(async () => {
                const payload = await idTokenAdapter.getIdTokenPayload(idToken, config.AUTH_CLIENT);
                if (!payload) return Promise.reject("id token invalid");
                if (!payload.email) return Promise.reject("id token email missing");
                if (!payload.email_verified) return Promise.reject("id token email not verified");
                if (!config.AUTH_EMAILS.includes(payload?.email)) return Promise.reject("email not authorized");
                return _cryptoAdapter.encrypt(JSON.stringify(idToken));
            })
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
