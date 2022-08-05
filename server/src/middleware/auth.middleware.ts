import { NextFunction, Request, Response } from "express";
import { globals } from "../globals";

import { renderPage } from "../services/render.service";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const accessTokenCookieName = "access_token";

    const accessToken = req.signedCookies[accessTokenCookieName];
    const idToken = <string>req.query["credential"];
    const redirect = <string>req.query["redirect"];

    if (accessToken)
        return Promise.resolve()
            .then(() => verifyAccessToken(accessToken))
            .then(() => next())
            .catch(err => {
                globals.console.error(err);
                return next(err);
            });

    if (idToken)
        return Promise.resolve()
            .then(() => verifyIdToken(idToken))
            .then(() => getAccessToken())
            .then(token => res
                .cookie(accessTokenCookieName, token, { secure: true, signed: true, httpOnly: true, sameSite: true })
                .redirect(redirect || "/"))
            .catch(err => {
                globals.console.error(err);
                return next(err);
            });

    return Promise.resolve()
        .then(() => renderPage("auth"))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => next(err));
}

function verifyAccessToken(accessToken: string): Promise<boolean> {
    // TODO: verify access token
    return Promise.resolve(!!accessToken);
}

function verifyIdToken(idToken: string): Promise<boolean> {
    // TODO: validate id token
    return Promise.resolve(!!idToken);
}

function getAccessToken(): string {
    // TODO: opaque access token
    return "access token";
}
