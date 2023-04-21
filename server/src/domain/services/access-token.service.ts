import { AccessTokenAPI } from "../ports/API/AccessToken.API";
import { IdTokenSPI } from "../ports/SPI/IdToken.SPI";
import { CryptoSPI } from "../ports/SPI/Crypto.SPI";
import { AccessToken } from "../objects/AccessToken";

export function accessTokenService(
    idTokenAdapters: Record<string, IdTokenSPI>,
    cryptoAdapter: CryptoSPI,
    config: {
        authClient: string,
        authEmails: string[]
    }
): AccessTokenAPI {
    return {
        getAccessToken: getAccessToken(cryptoAdapter, config.authEmails),
        createAccessToken: createAccessToken(cryptoAdapter, idTokenAdapters, config)
    };
}

function getAccessToken(
    cryptoAdapter: CryptoSPI,
    authEmails: string[]
) {
    return async (accessToken: string) => {
        const decryptedAccessToken = await cryptoAdapter.decrypt(accessToken);
        const accessTokenPayload = <Partial<AccessToken>>JSON.parse(decryptedAccessToken);
        if (!accessTokenPayload.email)
            return Promise.reject("invalid access token email");
        if (!authEmails.includes(accessTokenPayload.email))
            return Promise.reject("email not authorized");
        return <AccessToken>accessTokenPayload;
    };
}

function createAccessToken(
    cryptoAdapter: CryptoSPI,
    idTokenAdapters: Record<string, IdTokenSPI>,
    config: {
        authClient: string,
        authEmails: string[]
    }
) {
    return async (idToken: string, provider: string) => {
        const idTokenAdapter = idTokenAdapters[provider];
        if (!idTokenAdapter) return Promise.reject("id token adapter invalid");
        const idTokenPayload = await idTokenAdapter.getIdTokenPayload(idToken, config.authClient);
        if (!idTokenPayload) return Promise.reject("id token invalid");
        if (!idTokenPayload.email) return Promise.reject("id token email missing");
        if (!idTokenPayload.email_verified) return Promise.reject("id token email not verified");
        if (!config.authEmails.includes(idTokenPayload?.email)) return Promise.reject("email not authorized");
        const accessToken = await cryptoAdapter.encrypt(JSON.stringify({
            email: idTokenPayload.email,
        }));
        return accessToken;
    };
}
