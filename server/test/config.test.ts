/* eslint-disable sonarjs/no-duplicate-string */
import assert from "node:assert";
import { match } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { Config } from "../src/config";

describe("config", () => {
    let randomStringFactorySpy: jasmine.Spy<(length: number) => string>;
    let clustersFactorySpy: jasmine.Spy<() => number>;
    let readFileSpy: jasmine.Spy<(path: string | undefined) => string | undefined>;

    beforeEach(() => {
        randomStringFactorySpy = jasmine.createSpy("randomStringFactory").and.callFake((length: number) => Buffer.from("x".repeat(length)).toString("base64"));
        clustersFactorySpy = jasmine.createSpy("clustersFactory").and.callFake(() => 1);
        readFileSpy = jasmine.createSpy("readFile");
    });

    describe("NODE_ENV", () => {
        it("not set => default", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config.NODE_ENV).toEqual("production")
                )
            );
        });

        it("value", () => {
            const expected = "test-env-value";
            pipe(
                Config({ "NODE_ENV": expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config.NODE_ENV).toEqual(expected)
                )
            );
        });
    });

    describe("clusters", () => {
        it("not development => injected", () => {
            const expected = 42;
            clustersFactorySpy.and.returnValue(expected);
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => {
                        expect(clustersFactorySpy).toHaveBeenCalled();
                        expect(config.clusters).toEqual(expected);
                    }
                )
            );
        });

        it("development => 1", () => {
            pipe(
                Config({ "NODE_ENV": "development" }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => {
                        expect(clustersFactorySpy).not.toHaveBeenCalled();
                        expect(config.clusters).toEqual(1);
                    }
                )
            );
        });
    });

    describe("authClient", () => {
        it("not set => default", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config.authClient).toEqual("")
                )
            );
        });

        it("valid", () => {
            const expected = "test-env-value";
            pipe(
                Config({ "MEDIA_SHARE__AuthClient": expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config.authClient).toEqual(expected)
                )
            );
        });
    });

    [
        ["authEmails", "MEDIA_SHARE__AuthEmails", "@"],
        ["authDav", "MEDIA_SHARE__AuthDav", ":"]
    ].forEach(([configKey, envKey, include]) => describe(configKey as string, () => {
        it("not set => default", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual([])
                )
            );
        });

        it("invalid => default", () => {
            const testEnvValue = "test-env-value+random-0,     ,,,  ,";
            pipe(
                Config({ [envKey as string]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual([])
                )
            );
        });

        it("valid", () => {
            const testEnvValue = `test-env-value${include}random-1,test-env-value${include}random-2`;
            pipe(
                Config({ [envKey as string]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(testEnvValue.split(","))
                )
            );
        });

        it("valid (mixed valid and invalid values)", () => {
            const testEnvValidValues = `test-env-value${include}random-1,test-env-value${include}random-2`;
            const testEnvInvalidValues = "test-env-value+random-3";
            const testEnvValue = `${testEnvValidValues},${testEnvInvalidValues}`;
            pipe(
                Config({ [envKey as string]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(testEnvValidValues.split(","))
                )
            );
        });
    }));

    [
        ["davport", "MEDIA_SHARE__DavPort", 58092],
        ["webport", "MEDIA_SHARE__WebPort", 58082]
    ].forEach(([configKey, envKey, defaultValue]) => describe(configKey as string, () => {
        it("not set => default", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(defaultValue as number)
                )
            );
        });

        it("invalid => default", () => {
            const testEnvValue = String(1 + 65535);
            pipe(
                Config({ [envKey as string]: testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(defaultValue)
                )
            );
        });

        it("value", () => {
            const expected = String(42);
            pipe(
                Config({ [envKey as string]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(+expected)
                )
            );
        });
    }));

    [
        ["proxyLocation", "MEDIA_SHARE__ProxyLocation", "/"],
        ["mediaDir", "MEDIA_SHARE__MediaDir", "media"]
    ].forEach(([configKey, envKey, defaultValue]) => describe(configKey as string, () => {
        it("not set => default", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(defaultValue as string)
                )
            );
        });

        it("value", () => {
            const expected = "test-env-value";
            pipe(
                Config({ [envKey as string]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(expected)
                )
            );
        });
    }));

    describe("rateLimitPerSecond", () => {
        const clusters = 42;

        it("not set => default", () => {
            clustersFactorySpy.and.callFake(() => clusters);
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => {
                        expect(config.clusters).toEqual(clusters);
                        expect(config.rateLimitPerSecond).toEqual(20);
                    }
                )
            );
        });

        it("value", () => {
            clustersFactorySpy.and.callFake(() => clusters);
            const testEnvValue = String(42 * 15);
            pipe(
                Config({ "MEDIA_SHARE__RateLimitPerSecond": testEnvValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => {
                        expect(config.clusters).toEqual(clusters);
                        expect(config.rateLimitPerSecond).toEqual(Math.ceil(+testEnvValue / clusters));
                    }
                )
            );
        });
    });

    [
        ["rateLimitBurstFactor", "MEDIA_SHARE__RateLimitBurstFactor", 10],
        ["rateLimitPeriodMinutes", "MEDIA_SHARE__RateLimitPeriodMinutes", 1]
    ].forEach(([configKey, envKey, defaultValue]) => describe(configKey as string, () => {
        it("not set => default", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(defaultValue as number)
                )
            );
        });

        it("value", () => {
            const expected = String(42);
            pipe(
                Config({ [envKey as string]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(+expected)
                )
            );
        });
    }));

    [
        ["tokenKey", "MEDIA_SHARE__TokenKey", 32],
        ["cookieSecret", "MEDIA_SHARE__CookieSecret", 32]
    ].forEach(([configKey, envKey, defaultRandomStringLength]) => describe(configKey as string, () => {
        it("not set => random auto regenerated", () => {
            pipe(
                Config({}, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => {
                        expect(randomStringFactorySpy).toHaveBeenCalledWith(defaultRandomStringLength as number);
                        expect((config[configKey as keyof typeof Config] as string).length).toBeGreaterThan(defaultRandomStringLength as number);
                    }
                )
            );
        });

        it("value", () => {
            const expected = "test-env-value";
            pipe(
                Config({ [envKey as string]: expected }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(expected)
                )
            );
        });
    }));

    [
        ["certCrt", "MEDIA_SHARE__CertCrt", "cert.crt"],
        ["certKey", "MEDIA_SHARE__CertKey", "cert.key"]
    ].forEach(([configKey, envKey, fileName]) => describe(configKey as string, () => {
        const envValue = "first/file/path";

        it("first file (from env)", () => {
            const expected = "first-file-content";
            readFileSpy.and.callFake((path: string | undefined) => {
                switch (path) {
                    case envValue: return expected;
                    case `/run/secrets/${fileName}`: return "second-file-content";
                    case `certs/${fileName}`: return "third-file-content";
                    default: return undefined;
                }
            });
            pipe(
                Config({ [envKey as string]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(expected)
                )
            );
        });

        it("second file", () => {
            const expected = "second-file-content";
            readFileSpy.and.callFake((path: string | undefined) => {
                switch (path) {
                    case `/run/secrets/${fileName}`: return expected;
                    case `certs/${fileName}`: return "third-file-content";
                    default: return undefined;
                }
            });
            pipe(
                Config({ [envKey as string]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(expected)
                )
            );
        });

        it("third file", () => {
            const expected = "third-file-content";
            readFileSpy.and.callFake((path: string | undefined) => path === `certs/${fileName}` ? expected : undefined);
            pipe(
                Config({ [envKey as string]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(expected)
                )
            );
        });

        it("no file exist => default", () => {
            readFileSpy.and.callFake(() => undefined);
            pipe(
                Config({ [envKey as string]: envValue }, randomStringFactorySpy, clustersFactorySpy, readFileSpy),
                match(
                    error => assert.fail(error),
                    config => expect(config[configKey as keyof typeof Config]).toEqual(undefined)
                )
            );
        });
    }));
});
