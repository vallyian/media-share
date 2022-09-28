import { AccessTokenAPI, AccessToken } from "../ports/API/AccessToken.API";
import { IdTokenSPI } from "../ports/SPI/IdToken.SPI";
import { CryptoSPI } from "../ports/SPI/Crypto.SPI";

export class AccessTokenService implements AccessTokenAPI {
    constructor(
        private readonly idTokenAdapters: Record<string, IdTokenSPI>,
        private readonly cryptoAdapter: CryptoSPI,
        private readonly config: {
            authClient: string,
            authEmails: string[]
        }
    ) { }

    async getAccessToken(accessToken: string): Promise<AccessToken> {
        const decryptedAccessToken = await this.cryptoAdapter.decrypt(accessToken);
        const accessTokenPayload = <AccessToken>JSON.parse(decryptedAccessToken);
        if (!accessTokenPayload.email)
            return Promise.reject("invalid access token email");
        if (!this.config.authEmails.includes(accessTokenPayload.email))
            return Promise.reject("email not authorized");
        return accessTokenPayload;
    }

    async createAccessToken(idToken: string, provider: string) {
        const idTokenAdapter = this.idTokenAdapters[provider];
        if (!idTokenAdapter) return Promise.reject("id token adapter invalid");
        const idTokenPayload = await idTokenAdapter.getIdTokenPayload(idToken, this.config.authClient);
        if (!idTokenPayload) return Promise.reject("id token invalid");
        if (!idTokenPayload.email) return Promise.reject("id token email missing");
        if (!idTokenPayload.email_verified) return Promise.reject("id token email not verified");
        if (!this.config.authEmails.includes(idTokenPayload?.email)) return Promise.reject("email not authorized");
        const accessToken = this.cryptoAdapter.encrypt(JSON.stringify({
            email: idTokenPayload.email,
        }));
        return accessToken;
    }
}
