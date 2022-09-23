export type IdToken = {
    email?: string;
    email_verified?: boolean;
}

export type IdTokenSPI = {
    getIdTokenPayload: (idToken: string, clientId: string) => Promise<undefined | IdToken>;
    csp: {
        scriptSrcElem?: string[];
        connectSrc?: string[];
        frameSrc?: string[];
    };
    html: string;
}
