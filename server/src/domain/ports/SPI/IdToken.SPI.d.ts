export interface IdTokenSPI {
    /**
     * Get validated token paylod from JWT string
     */
    getIdTokenPayload: (idToken: string, clientId: string) => Promise<undefined | {
        email?: string;
        email_verified?: boolean;
    }>;

    /**
     * Set CSP values to allow requests in browser
     */
    csp: {
        scriptSrcElem?: string[];
        connectSrc?: string[];
        frameSrc?: string[];
    };

    /**
     * Set html for render signin details
     */
    html: string;
}
