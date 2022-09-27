import { ContentSecurityPolicy } from "../SPI/IdToken.SPI";

export interface IdTokenAPI {
    /**
     * Get external provider html for render its signin details
     * @param provider
     */
    html(provider: string): Promise<string>;

    /**
     * Get external provider CSP to allow requests in browser
     */
    csp(): ContentSecurityPolicy[];
}
