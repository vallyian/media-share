import { left, right } from "fp-ts/lib/Either";

export type Config = Extract<ReturnType<typeof Config>, { _tag: "Right" }>["right"];
export function Config(
    environment: Record<string, string | undefined>,
    randomStringFactory: (length: number) => string,
    clustersFactory: () => number,
    readFile: (path: string) => string | undefined
) {
    const invalidConfig = new Array<string>();

    const NODE_ENV = env("NODE_ENV", env("TS_NODE_DEV", "false") === "true" ? "development" : "production");
    const clusters = NODE_ENV === "development" ? 1 : clustersFactory();

    const config = {
        NODE_ENV,
        clusters,
        authClient: env("MEDIA_SHARE__AuthClient"),
        authEmails: env("MEDIA_SHARE__AuthEmails").split(",").map(s => s.trim()).filter(s => s.includes("@")),
        authDav: env("MEDIA_SHARE__AuthDav").split(",").map(s => s.trim()).filter(s => s.includes(":")),
        davport: envNumber("MEDIA_SHARE__DavPort", 58092, 1, 65535),
        webport: envNumber("MEDIA_SHARE__WebPort", 58082, 1, 65535),
        proxyLocation: env("MEDIA_SHARE__ProxyLocation", "/"),
        mediaDir: env("MEDIA_SHARE__MediaDir", "media"),
        rateLimitPerSecond: Math.ceil(envNumber("MEDIA_SHARE__RateLimitPerSecond", 20 * clusters) / clusters),
        rateLimitBurstFactor: envNumber("MEDIA_SHARE__RateLimitBurstFactor", 10),
        rateLimitPeriodMinutes: envNumber("MEDIA_SHARE__RateLimitPeriodMinutes", 1),
        tokenKey: env("MEDIA_SHARE__TokenKey", randomStringFactory(32)),
        cookieSecret: env("MEDIA_SHARE__CookieSecret", randomStringFactory(32)),
        certCrt: envFile("MEDIA_SHARE__CertCrt", "/run/secrets/cert.crt", "certs/cert.crt"),
        certKey: envFile("MEDIA_SHARE__CertKey", "/run/secrets/cert.key", "certs/cert.key"),
        logToFiles: env("MEDIA_SHARE__LogToFiles") === "true",

        get clusterSharedEnv() {
            return {
                "MEDIA_SHARE__TokenKey": this.tokenKey,
                "MEDIA_SHARE__CookieSecret": this.cookieSecret
            };
        }
    };

    return invalidConfig.length
        ? left(Error(`config key(s) ${invalidConfig.join(", ")} invalid`))
        : right(config);

    function env(key: string, def = "") { return environment[key] || def; }

    function envNumber(key: string, def = 0, min = NaN, max = NaN): number {
        const val = +<string>environment[key] || NaN;
        const fn = (n: number) => isFinite(n) && (isNaN(min) || n >= min) && (isNaN(max) || n <= max);
        return fn(val) ? val : fn(def) ? def : (invalidConfig.push(key), NaN);
    }

    function envFile(key: string, def1: string, def2: string) {
        return readFile(env(key)) || readFile(def1) || readFile(def2);
    }
}
