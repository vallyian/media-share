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
        const policies = Object.values(this.idTokenAdapters).map(a => a.csp);
        return {
            scriptSrcElem: policies.flatMap(p => p.scriptSrcElem || []),
            connectSrc: policies.flatMap(p => p.connectSrc || []),
            frameSrc: policies.flatMap(p => p.frameSrc || []),
        };
    }

    private getAdapter(provider: string) {
        const adapter = this.idTokenAdapters[provider];
        if (!adapter)
            throw Error("id token adapter invalid");
        return adapter;
    }
}
