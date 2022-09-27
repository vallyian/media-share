/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */

import fsService from "./domain/services/media-access.service";

describe("env", () => {
    const validFormatClientId = "test.apps.googleusercontent.com";
    const validFormatEmails = "test@gmail.com";
    const env = () => require("./env").default;

    beforeEach(() => {
        spyOn(fsService, "readFileSync").and.returnValue(undefined);
        spyOn(console, "error");
        delete require.cache[require.resolve("./env")];
        process.env["AUTH_CLIENT"] = validFormatClientId;
        process.env["AUTH_EMAILS"] = validFormatEmails;
    });

    describe("AUTH_CLIENT", () => {
        it("not set => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            delete process.env["AUTH_CLIENT"];
            expect(env).toThrow(testError);
        });

        it("invalid => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            process.env["AUTH_CLIENT"] = "";
            expect(env).toThrow(testError);
        });

        it("valid", () => {
            process.env["AUTH_CLIENT"] = validFormatClientId;
            expect(env().AUTH_CLIENT).toEqual(validFormatClientId);
        });
    });

    describe("AUTH_EMAILS", () => {
        it("not set => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            delete process.env["AUTH_EMAILS"];
            expect(env).toThrow(testError);
        });

        it("invalid => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            process.env["AUTH_EMAILS"] = "test_email.com";
            expect(env).toThrow(testError);
        });

        it("valid (1 value)", () => {
            process.env["AUTH_EMAILS"] = validFormatEmails;
            expect(env().AUTH_EMAILS).toEqual([validFormatEmails]);
        });

        it("valid (2 values)", () => {
            const testEmails = [validFormatEmails, "test-2@gmail.com"];
            process.env["AUTH_EMAILS"] = testEmails.join(",");
            expect(env().AUTH_EMAILS).toEqual(testEmails);
        });
    });

    describe("NODE_ENV", () => {
        it("not set => default", () => {
            delete process.env["NODE_ENV"];
            expect(env().NODE_ENV).toEqual("production");
        });

        it("value", () => {
            process.env["NODE_ENV"] = "overwritten";
            expect(env().NODE_ENV).toEqual(process.env["NODE_ENV"]);
        });
    });

    describe("PORT", () => {
        it("not set => default", () => {
            delete process.env["PORT"];
            expect(env().PORT).toEqual(58082);
        });

        it("invalid => default", () => {
            process.env["PORT"] = "99999999";
            expect(env().PORT).toEqual(58082);
        });

        it("value", () => {
            process.env["PORT"] = "42";
            expect(env().PORT).toEqual(+process.env["PORT"]);
        });
    });

    describe("COOKIE_PASS", () => {
        it("not set => default (regenerated)", () => {
            delete require.cache[require.resolve("./env")];
            delete process.env["COOKIE_PASS"];
            const firstValue = env().COOKIE_PASS;
            expect(firstValue.length).toEqual(342);

            delete process.env["COOKIE_PASS"];
            delete require.cache[require.resolve("./env")];
            const secondValue = env().COOKIE_PASS;
            expect(secondValue.length).toEqual(342);

            expect(secondValue).not.toEqual(firstValue);
        });

        it("value", () => {
            process.env["COOKIE_PASS"] = "overwritten";
            expect(env().COOKIE_PASS).toEqual(process.env["COOKIE_PASS"]);
        });
    });

    describe("TOKEN_KEY", () => {
        it("not set => default (regenerated)", () => {
            delete require.cache[require.resolve("./env")];
            delete process.env["TOKEN_KEY"];
            const firstValue = env().TOKEN_KEY;
            expect(firstValue.length).toEqual(43);

            delete process.env["TOKEN_KEY"];
            delete require.cache[require.resolve("./env")];
            const secondValue = env().TOKEN_KEY;
            expect(secondValue.length).toEqual(43);

            expect(secondValue).not.toEqual(firstValue);
        });

        it("value", () => {
            process.env["TOKEN_KEY"] = "overwritten";
            expect(env().TOKEN_KEY).toEqual(process.env["TOKEN_KEY"]);
        });
    });
});
