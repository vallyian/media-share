export function Config(
    environment: Record<string, string | undefined>,
    exit: (key: string) => never,
    randomStringFactory: (length: number) => string,
    clustersFactory: () => number,
    readFile: (path: string) => string | undefined
) {
    const NODE_ENV = env("NODE_ENV", "production");
    const clusters = NODE_ENV === "development" ? 1 : clustersFactory();

    return {
        NODE_ENV,
        clusters,
        authClient: env("MEDIA_SHARE__AuthClient"),
        authEmails: env("MEDIA_SHARE__AuthEmails").split(",").map(s => s.trim()).filter(s => s.includes("@")),
        authDav: env("MEDIA_SHARE__AuthDav").split(",").map(s => s.trim()).filter(s => s.includes(":")),
        davport: envNumber("MEDIA_SHARE__DavPort", 58092, 1, 65535),
        webport: envNumber("MEDIA_SHARE__WebPort", 58082, 1, 65535),
        proxyLocation: env("MEDIA_SHARE__ProxyLocation", "/"),
        mediaDir: env("MEDIA_SHARE__MediaDir", "media"),
        rateLimitPerSecond: Math.ceil(envNumber("MEDIA_SHARE__RateLimitPerSecond", clusters) / clusters),
        rateLimitBurstFactor: envNumber("MEDIA_SHARE__RateLimitBurstFactor", 10),
        rateLimitPeriodMinutes: envNumber("MEDIA_SHARE__RateLimitPeriodMinutes", 1),
        tokenKey: env("MEDIA_SHARE__TokenKey", randomStringFactory(32)),
        cookieSecret: env("MEDIA_SHARE__CookieSecret", randomStringFactory(32)),
        certCrt: readFile(env("MEDIA_SHARE__CertCrt")) || readFile("/run/secrets/cert.crt") || readFile("certs/cert.crt"),
        certKey: readFile(env("MEDIA_SHARE__CertKey")) || readFile("/run/secrets/cert.key") || readFile("certs/cert.key"),

        get clusterSharedEnv() {
            return {
                "MEDIA_SHARE__TokenKey": this.tokenKey,
                "MEDIA_SHARE__CookieSecret": this.cookieSecret
            };
        }
    };

    function env(key: string, def = "") { return environment[key] || def; }

    function envNumber(key: string, def = 0, min = NaN, max = NaN): number {
        const val = +env(key, String(def));
        return isFinite(val) && (isNaN(min) || val >= min) && (isNaN(max) || val <= max) ? val : exit(key);
    }
}
