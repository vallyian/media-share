export type IdTokenPayload = {
    email: string;
    email_verified: boolean;
}

export type IdTokenAdapter = {
    getIdTokenPayload: (idToken: string, clientId: string) => Promise<Partial<IdTokenPayload> | undefined>;
    csp: {
        scriptSrcElem?: string[];
        connectSrc?: string[];
        frameSrc?: string[];
    };
    html: string;
};
