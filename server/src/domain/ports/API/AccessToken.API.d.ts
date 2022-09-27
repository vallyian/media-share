export {
    AccessTokenAPI,

    AccessToken
};

interface AccessTokenAPI {
    /**
     * Get decrypted access token payload
     * @param accessToken
     */
    getAccessToken(accessToken: string): Promise<AccessToken>;

    /**
     * Create encrypted access token
     * @param idToken JWT token string
     * @param provider authentication provider
     */
    createAccessToken(idToken: string, provider: string): Promise<string>;
}

interface AccessToken {
    email: string;
}
