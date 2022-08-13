import * as gAuthLib from "google-auth-library";

import { env } from "../env";
import * as cryptoService from "../services/crypto.service";

type IdTokenPayload = gAuthLib.TokenPayload;
type AccessTokenPayload = Pick<IdTokenPayload, "email">;

export function getIdTokenPayload(idToken: string): Promise<IdTokenPayload> {
    return Promise.resolve()
        .then(() => new gAuthLib.OAuth2Client(env.G_CLIENT_ID))
        .then(gClient => gClient.verifyIdToken({
            idToken,
            audience: env.G_CLIENT_ID,
        }))
        .then(ticket => ticket.getPayload() || Promise.reject("id token payload is undefined"));
}

export function getAccessToken(idToken: IdTokenPayload): Promise<string> {
    return Promise.resolve()
        .then(() => idToken.email_verified || Promise.reject("id token email not verified"))
        .then(() => idToken.email || Promise.reject("invalid id token email"))
        .then(() => env.G_EMAILS.includes(<string>idToken.email) || Promise.reject("email not authorized"))
        .then(() => (<AccessTokenPayload>{ email: idToken.email }))
        .then(payload => JSON.stringify(payload))
        .then(payload => cryptoService.encrypt(payload));
}

export function getAccessTokenPayload(accessToken: string): Promise<AccessTokenPayload> {
    return Promise.resolve()
        .then(() => cryptoService.decrypt(accessToken))
        .then(decrypted => <Partial<AccessTokenPayload>>JSON.parse(decrypted))
        .then(token => {
            if (!token.email) return Promise.reject("invalid access token email");
            if (!env.G_EMAILS.includes(token.email)) return Promise.reject("email not authorized");
            return token;
        });
}
