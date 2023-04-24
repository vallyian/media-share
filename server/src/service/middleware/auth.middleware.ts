import { NextFunction, Request, Response } from "express";
import { AccessTokenAPI } from "../../domain/ports/API/AccessToken.API";
import { IdTokenAPI } from "../../domain/ports/API/IdToken.API";

export function AuthMiddleware(
    idTokenService: IdTokenAPI,
    accessTokenService: AccessTokenAPI
) {
    const accessTokenCookieName = "access_token";

    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        const idTokenProvider = "google";

        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const accessToken = req.signedCookies[accessTokenCookieName];
            if (accessToken) {
                const token = await accessTokenService.getAccessToken(String(accessToken));
                req.user = token.email;
                return next();
            }

            const idToken = typeof req.query["id_token"] === "string" ? req.query["id_token"] : "";
            if (idToken) {
                const accessToken = await accessTokenService.createAccessToken(idToken, idTokenProvider);
                return res
                    .cookie(accessTokenCookieName, accessToken, { secure: true, signed: true, httpOnly: true, sameSite: true })
                    .redirect(req.path);
            }
        } catch (ex) {
            const err = ex instanceof Error ? ex : Error(<string>ex);
            err.status = 403;
            return next(err);
        }

        try {
            const html = await idTokenService.html(idTokenProvider);
            return res.status(401).render("index", { baseUrl: req.baseUrl, html });
        } catch (err) {
            return next(err);
        }
    }
}
