import { IdTokenAPI } from "../ports/API/IdToken.API";
import { IdTokenSPI } from "../ports/SPI/IdToken.SPI";

export function idTokenService(idTokenAdapters: Record<string, IdTokenSPI>): IdTokenAPI {
    return {
        html: getHTML(idTokenAdapters),
        csp: getCSP(idTokenAdapters)
    };
}

function getHTML(idTokenAdapters: Record<string, IdTokenSPI>) {
    const getAdapter = (provider: string) => {
        const adapter = idTokenAdapters[provider];
        if (!adapter)
            throw Error("id token adapter invalid");
        return adapter;
    };
    return (provider: string) => Promise.resolve(provider)
        .then(getAdapter)
        .then(({ html }) => html);
}

function getCSP(idTokenAdapters: Record<string, IdTokenSPI>) {
    const policies = Object.values(idTokenAdapters).map(a => a.csp);
    return () => ({
        scriptSrcElem: policies.flatMap(p => p.scriptSrcElem || []),
        connectSrc: policies.flatMap(p => p.connectSrc || []),
        frameSrc: policies.flatMap(p => p.frameSrc || []),
    });
}
