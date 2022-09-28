import crypto from "node:crypto";
import { Config } from "./config";

/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */
describe("config", () => {
    const requiredEnv = {
        "MEDIA_SHARE__AuthClient": "MEDIA_SHARE__AuthClient",
        "MEDIA_SHARE__AuthEmails": "MEDIA_SHARE__AuthEmails@test.com",
    };
    let exitSpy: jasmine.Spy<(key: string) => never>;
    const randomStringFactory = (length: number) => crypto.randomBytes(length).toString("base64");
    const clustersFactory = () => 42;

    beforeEach(() => {
        exitSpy = jasmine.createSpy("exit", (key: string) => <never>key);
    });

    describe("NODE_ENV", () => {
        const envKey = "NODE_ENV";

        it("not set => default", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.NODE_ENV).toEqual("production");
        });

        it("value", () => {
            const testEnvValue = "overwritten";
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.NODE_ENV).toEqual(testEnvValue);
        });
    });

    describe("authClient", () => {
        const envKey = "MEDIA_SHARE__AuthClient";

        it("not set => exit", () => {
            const testEnvValue = undefined;
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("invalid => exit", () => {
            const testEnvValue = "";
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("valid", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.authClient).toEqual(requiredEnv[envKey]);
        });
    });

    describe("authEmails", () => {
        const envKey = "MEDIA_SHARE__AuthEmails";

        it("not set => exit", () => {
            const testEnvValue = undefined;
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("invalid (blank) => exit", () => {
            const testEnvValue = "";
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("invalid (not email) => exit", () => {
            const testEnvValue = "test.email.com";
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("valid (single valid value)", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.authEmails).toEqual([requiredEnv[envKey]]);
        });

        it("valid (multiple valid values)", () => {
            const testEnvValue = `${requiredEnv[envKey]},other_id@email.com`;
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.authEmails).toEqual(testEnvValue.split(","));
        });
    });

    describe("tokenKey", () => {
        const envKey = "MEDIA_SHARE__TokenKey";

        it("not set => random auto regenerated", () => {
            const configFirst = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            const configSecond = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(configFirst.tokenKey.length).toEqual(44);
            expect(configSecond.tokenKey.length).toEqual(44);
            expect(configFirst.tokenKey).not.toEqual(configSecond.tokenKey);
        });

        it("value", () => {
            const testEnvValue = randomStringFactory(32);
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.tokenKey).toEqual(testEnvValue);
        });
    });

    describe("cookieSecret", () => {
        const envKey = "MEDIA_SHARE__CookieSecret";

        it("not set => random auto regenerated", () => {
            const configFirst = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            const configSecond = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(configFirst.cookieSecret.length).toEqual(44);
            expect(configSecond.cookieSecret.length).toEqual(44);
            expect(configFirst.cookieSecret).not.toEqual(configSecond.cookieSecret);
        });

        it("value", () => {
            const testEnvValue = randomStringFactory(32);
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.cookieSecret).toEqual(testEnvValue);
        });
    });

    describe("port", () => {
        const envKey = "MEDIA_SHARE__Port";

        it("not set => default", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.port).toEqual(58082);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 65535);
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.port).toEqual(+testEnvValue);
        });
    });

    describe("rateLimitMinutes", () => {
        const envKey = "MEDIA_SHARE__RateLimitMinutes";

        it("not set => default", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.rateLimitMinutes).toEqual(5);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 24 * 60);
            new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.rateLimitMinutes).toEqual(+testEnvValue);
        });
    });

    describe("proxyLocation", () => {
        const envKey = "MEDIA_SHARE__ProxyLocation";

        it("not set => default", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.proxyLocation).toEqual("/");
        });

        it("empty => default", () => {
            const testEnvValue = "";
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.proxyLocation).toEqual("/");
        });

        it("value", () => {
            const testEnvValue = "MEDIA_SHARE__ProxyLocation";
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.proxyLocation).toEqual(testEnvValue);
        });
    });

    describe("proxyLocation", () => {
        const envKey = "MEDIA_SHARE__ProxyLocation";

        it("not set => default", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.proxyLocation).toEqual("/");
        });

        it("empty => default", () => {
            const testEnvValue = "";
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.proxyLocation).toEqual("/");
        });

        it("value", () => {
            const testEnvValue = "MEDIA_SHARE__ProxyLocation";
            const config = new Config({ ...requiredEnv, [envKey]: testEnvValue }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.proxyLocation).toEqual(testEnvValue);
        });
    });

    describe("clusters", () => {
        it("default => max", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            const testClusters = clustersFactory();
            expect(testClusters).toBeGreaterThan(1);
            expect(config.clusters).toEqual(testClusters);
        });

        it("development => 1", () => {
            const config = new Config({ ...requiredEnv, "NODE_ENV": "development" }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.clusters).toEqual(1);
        });
    });

    describe("rateLimitCounter", () => {
        it("value", () => {
            const rateLimitMinutes = 42;
            const clusters = clustersFactory();
            const config = new Config({ ...requiredEnv, "MEDIA_SHARE__RateLimitMinutes": String(rateLimitMinutes) }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.clusters).toEqual(clusters);
            expect(config.rateLimitMinutes).toEqual(rateLimitMinutes);
            expect(config.rateLimitCounter).toEqual(rateLimitMinutes * 60 * 5 / clusters);
        });
    });

    describe("mediaDir", () => {
        it("value", () => {
            const config = new Config({ ...requiredEnv }, exitSpy, randomStringFactory, clustersFactory);
            expect(config.mediaDir).toEqual("media");
        });
    });
});
