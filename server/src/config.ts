export function Config(
    environment: Record<string, string | undefined>,
    exit: (key: string) => never,
    randomStringFactory: (length: number) => string,
    clustersFactory: () => number,
    readFile: (path: string) => string | undefined
) {
    const NODE_ENV = env("NODE_ENV", "production");

    return {
        NODE_ENV,
        authClient: env("MEDIA_SHARE__AuthClient"),
        authEmails: env("MEDIA_SHARE__AuthEmails").split(",").map(s => s.trim()).filter(s => s.includes("@")),
        authDav: env("MEDIA_SHARE__AuthDav").split(",").map(s => s.trim()).filter(s => !!s),
        tokenKey: env("MEDIA_SHARE__TokenKey", randomStringFactory(32)),
        cookieSecret: env("MEDIA_SHARE__CookieSecret", randomStringFactory(32)),
        davport: number("MEDIA_SHARE__DavPort", 58092, n => n > 0 && n <= 65535),
        webport: number("MEDIA_SHARE__WebPort", 58082, n => n > 0 && n <= 65535),
        proxyLocation: env("MEDIA_SHARE__ProxyLocation", "/"),
        mediaDir: env("MEDIA_SHARE__MediaDir", "media"),
        certCrt: readFile("/run/secrets/cert.crt") || readFile("certs/cert.crt") || readFile(env("MEDIA_SHARE__CertCrt")),
        certKey: readFile("/run/secrets/cert.key") || readFile("certs/cert.key") || readFile(env("MEDIA_SHARE__CertKey")),
        clusters: NODE_ENV === "development" ? 1 : clustersFactory(),
        rateLimitMinutes: number("MEDIA_SHARE__RateLimitMinutes", 5, n => n > 0 && n <= 24 * 60),

        get rateLimitCounter() { return Math.ceil(this.rateLimitMinutes * 60 * 5 / this.clusters); },

        get clusterSharedEnv() {
            return {
                "MEDIA_SHARE__TokenKey": this.tokenKey,
                "MEDIA_SHARE__CookieSecret": this.cookieSecret
            };
        }
    };

    function env(key: string, def = "") { return environment[key] || def; }

    function number(key: string, def: number, validate: (val: number) => boolean): number {
        const val = env(key) ? +env(key) : def;
        return typeof val === "number" && isFinite(val) && (!validate || validate(val)) ? val : exit(key);
    }
}
