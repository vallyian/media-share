import { Config } from "./config";

describe("config", () => {
    let randomStringFactorySpy: jasmine.Spy<(length: number) => string>;
    let clustersFactorySpy: jasmine.Spy<() => number>;
    let readFileSpy: jasmine.Spy<(path: string) => string | undefined>;

    beforeEach(() => {
        randomStringFactorySpy = jasmine.createSpy("randomStringFactory").and.callFake((length: number) => Buffer.from("x".repeat(length)).toString("base64"));
        clustersFactorySpy = jasmine.createSpy("clustersFactory").and.callFake(() => 1);
        readFileSpy = jasmine.createSpy("readFile");
    });

    describe("NODE_ENV", () => {
        it("not set => default", () => {
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.NODE_ENV).toEqual("production");
        });

        it("value", () => {
            const expected = "test-env-value";
            const { config } = Config({ "NODE_ENV": expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.NODE_ENV).toEqual(expected);
        });
    });

    describe("clusters", () => {
        it("not development => injected", () => {
            const expected = 42;
            clustersFactorySpy.and.returnValue(expected);
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(clustersFactorySpy).toHaveBeenCalled();
            expect(config.clusters).toEqual(expected);
        });

        it("development => 1", () => {
            const { config } = Config({ "NODE_ENV": "development" }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(clustersFactorySpy).not.toHaveBeenCalled();
            expect(config.clusters).toEqual(1);
        });
    });

    describe("authClient", () => {
        it("not set => default", () => {
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authClient).toEqual("");
        });

        it("valid", () => {
            const expected = "test-env-value";
            const { config } = Config({ "MEDIA_SHARE__AuthClient": expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authClient).toEqual(expected);
        });
    });

    [
        ["authEmails", "MEDIA_SHARE__AuthEmails", "@"],
        ["authDav", "MEDIA_SHARE__AuthDav", ":"]
    ].forEach(([configKey, envKey, include]) => describe(<string>configKey, () => {
        it("not set => default", () => {
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual([]);
        });

        it("invalid => default", () => {
            const testEnvValue = "test-env-value+random-0,     ,,,  ,";
            const { config } = Config({ [<string>envKey]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual([]);
        });

        it("valid", () => {
            const testEnvValue = `test-env-value${include}random-1,test-env-value${include}random-2`;
            const { config } = Config({ [<string>envKey]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(testEnvValue.split(","));
        });

        it("valid (mixed valid and invalid values)", () => {
            const testEnvValidValues = `test-env-value${include}random-1,test-env-value${include}random-2`;
            const testEnvInvalidValues = "test-env-value+random-3";
            const testEnvValue = `${testEnvValidValues},${testEnvInvalidValues}`;
            const { config } = Config({ [<string>envKey]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(testEnvValidValues.split(","));
        });
    }));

    [
        ["davport", "MEDIA_SHARE__DavPort", 58092],
        ["webport", "MEDIA_SHARE__WebPort", 58082]
    ].forEach(([configKey, envKey, defaultValue]) => describe(<string>configKey, () => {
        it("not set => default", () => {
            const { config, invalidConfig } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(invalidConfig.length).toEqual(0);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(<number>defaultValue);
        });

        it("invalid => default", () => {
            const testEnvValue = String(1 + 65535);
            const { config } = Config({ [<string>envKey]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(defaultValue);
        });

        it("value", () => {
            const expected = String(42);
            const { config, invalidConfig } = Config({ [<string>envKey]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(invalidConfig.length).toEqual(0);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(+expected);
        });
    }));

    [
        ["proxyLocation", "MEDIA_SHARE__ProxyLocation", "/"],
        ["mediaDir", "MEDIA_SHARE__MediaDir", "media"]
    ].forEach(([configKey, envKey, defaultValue]) => describe(<string>configKey, () => {
        it("not set => default", () => {
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(<string>defaultValue);
        });

        it("value", () => {
            const expected = "test-env-value";
            const { config } = Config({ [<string>envKey]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(expected);
        });
    }));

    describe("rateLimitPerSecond", () => {
        const clusters = 42;

        it("not set => default", () => {
            clustersFactorySpy.and.callFake(() => clusters);
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.clusters).toEqual(clusters);
            expect(config.rateLimitPerSecond).toEqual(20);
        });

        it("value", () => {
            clustersFactorySpy.and.callFake(() => clusters);
            const testEnvValue = String(42 * 15);
            const { config, invalidConfig } = Config({ "MEDIA_SHARE__RateLimitPerSecond": testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.clusters).toEqual(clusters);
            expect(invalidConfig.length).toEqual(0);
            expect(config.rateLimitPerSecond).toEqual(Math.ceil(+testEnvValue / clusters));
        });
    });

    [
        ["rateLimitBurstFactor", "MEDIA_SHARE__RateLimitBurstFactor", 10],
        ["rateLimitPeriodMinutes", "MEDIA_SHARE__RateLimitPeriodMinutes", 1]
    ].forEach(([configKey, envKey, defaultValue]) => describe(<string>configKey, () => {
        it("not set => default", () => {
            const { config, invalidConfig } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(invalidConfig.length).toEqual(0);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(<number>defaultValue);
        });

        it("value", () => {
            const expected = String(42);
            const { config, invalidConfig } = Config({ [<string>envKey]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(invalidConfig.length).toEqual(0);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(+expected);
        });
    }));

    [
        ["tokenKey", "MEDIA_SHARE__TokenKey", 32],
        ["cookieSecret", "MEDIA_SHARE__CookieSecret", 32]
    ].forEach(([configKey, envKey, defaultRandomStringLength]) => describe(<string>configKey, () => {
        it("not set => random auto regenerated", () => {
            const { config } = Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(randomStringFactorySpy).toHaveBeenCalledWith(<number>defaultRandomStringLength);
            expect((<string>config[<keyof ReturnType<typeof Config>["config"]>configKey]).length).toBeGreaterThan(<number>defaultRandomStringLength);
        });

        it("value", () => {
            const expected = "test-env-value";
            const { config } = Config({ [<string>envKey]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(expected);
        });
    }));

    [
        ["certCrt", "MEDIA_SHARE__CertCrt", "cert.crt"],
        ["certKey", "MEDIA_SHARE__CertKey", "cert.key"]
    ].forEach(([configKey, envKey, fileName]) => describe(<string>configKey, () => {
        const envValue = "first/file/path";

        it("first file (from env)", () => {
            const expected = "first-file-content";
            readFileSpy.and.callFake((path: string) => {
                switch (path) {
                    case envValue: return expected;
                    case `/run/secrets/${fileName}`: return "second-file-content";
                    case `certs/${fileName}`: return "third-file-content";
                    default: return undefined;
                }
            });
            const { config } = Config({ [<string>envKey]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(expected);
        });

        it("second file", () => {
            const expected = "second-file-content";
            readFileSpy.and.callFake((path: string) => {
                switch (path) {
                    case `/run/secrets/${fileName}`: return expected;
                    case `certs/${fileName}`: return "third-file-content";
                    default: return undefined;
                }
            });
            const { config } = Config({ [<string>envKey]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(expected);
        });

        it("third file", () => {
            const expected = "third-file-content";
            readFileSpy.and.callFake((path: string) => {
                switch (path) {
                    case `certs/${fileName}`: return expected;
                    default: return undefined;
                }
            });
            const { config } = Config({ [<string>envKey]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(expected);
        });

        it("no file exist => default", () => {
            readFileSpy.and.callFake(() => undefined);
            const { config } = Config({ [<string>envKey]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config[<keyof ReturnType<typeof Config>["config"]>configKey]).toEqual(undefined);
        });
    }));
});
