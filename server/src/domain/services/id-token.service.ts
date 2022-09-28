import { IdTokenAPI } from "../ports/API/IdToken.API";
import { IdTokenSPI } from "../ports/SPI/IdToken.SPI";

export class IdTokenService implements IdTokenAPI {
    constructor(
        private readonly idTokenAdapters: Record<string, IdTokenSPI>
    ) { }

    async html(provider: string) {
        return this.getAdapter(provider).html;
    }

    csp() {
        return Object.values(this.idTokenAdapters).map(a => a.csp);
    }

    private getAdapter(provider: string) {
        const adapter = this.idTokenAdapters[provider];
        if (!adapter)
            throw Error("id token adapter invalid");
        return adapter;
    }
}
