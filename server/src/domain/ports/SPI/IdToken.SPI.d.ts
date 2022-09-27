export {
    IdTokenSPI,

    IdToken,
    ContentSecurityPolicy
};

interface IdTokenSPI {
    /**
     * Get validated token paylod from JWT string
     */
    getIdTokenPayload: (idToken: string, clientId: string) => Promise<undefined | IdToken>;

    /**
     * Set CSP values to allow requests in browser
     */
    csp: ContentSecurityPolicy;

    /**
     * Set html for render signin details
     */
    html: string;
}

interface IdToken {
    email?: string;
    email_verified?: boolean;
}

interface ContentSecurityPolicy {
    scriptSrcElem?: string[];
    connectSrc?: string[];
    frameSrc?: string[];
}
