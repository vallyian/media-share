/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */

import fs from "node:fs";

import * as process from "./internals/process";

describe("env", () => {
    const validFormatClientId = "test.apps.googleusercontent.com";
    const validFormatEmails = "test@gmail.com";

    beforeEach(() => {
        spyOn(fs, "existsSync").and.returnValue(false);
        delete require.cache[require.resolve("./env")];
        process.env["G_CLIENT_ID"] = validFormatClientId;
        process.env["G_EMAILS"] = validFormatEmails;
    });

    describe("G_CLIENT_ID", () => {
        it("not set => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            delete process.env["G_CLIENT_ID"];
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("invalid => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            process.env["G_CLIENT_ID"] = "test.unexpected.com";
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("valid", () => {
            process.env["G_CLIENT_ID"] = validFormatClientId;
            const { env } = require("./env");
            expect(env.G_CLIENT_ID).toEqual(validFormatClientId);
        });
    });

    describe("G_EMAILS", () => {
        it("not set => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            delete process.env["G_EMAILS"];
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("invalid => process exit", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            process.env["G_EMAILS"] = "test@email.com";
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("valid (1 value)", () => {
            process.env["G_EMAILS"] = validFormatEmails;
            const { env } = require("./env");
            expect(env.G_EMAILS).toEqual([validFormatEmails]);
        });

        it("valid (2 values)", () => {
            const testEmails = [validFormatEmails, "test-2@gmail.com"];
            process.env["G_EMAILS"] = testEmails.join(",");
            const { env } = require("./env");
            expect(env.G_EMAILS).toEqual(testEmails);
        });
    });

    describe("NODE_ENV", () => {
        it("not set => default", () => {
            delete process.env["NODE_ENV"];
            const { env } = require("./env");
            expect(env.NODE_ENV).toEqual("production");
        });

        it("value", () => {
            process.env["NODE_ENV"] = "overwritten";
            const { env } = require("./env");
            expect(env.NODE_ENV).toEqual(process.env["NODE_ENV"]);
        });
    });

    describe("PORT", () => {
        it("not set => default", () => {
            delete process.env["PORT"];
            const { env } = require("./env");
            expect(env.PORT).toEqual(58082);
        });

        it("invalid => default", () => {
            process.env["PORT"] = "99999999";
            const { env } = require("./env");
            expect(env.PORT).toEqual(58082);
        });

        it("value", () => {
            process.env["PORT"] = "42";
            const { env } = require("./env");
            expect(env.PORT).toEqual(+process.env["PORT"]);
        });
    });

    describe("COOKIE_PASS", () => {
        it("not set => default (regenerated)", () => {
            delete require.cache[require.resolve("./env")];
            delete process.env["COOKIE_PASS"];
            let env = require("./env").env;
            const firstValue = env.COOKIE_PASS;
            expect(firstValue.length).toEqual(342);

            delete process.env["COOKIE_PASS"];
            delete require.cache[require.resolve("./env")];
            env = require("./env").env;
            const secondValue = env.COOKIE_PASS;
            expect(secondValue.length).toEqual(342);

            expect(secondValue).not.toEqual(firstValue);
        });

        it("value", () => {
            process.env["COOKIE_PASS"] = "overwritten";
            const { env } = require("./env");
            expect(env.COOKIE_PASS).toEqual(process.env["COOKIE_PASS"]);
        });
    });

    describe("TOKEN_KEY", () => {
        it("not set => default (regenerated)", () => {
            delete require.cache[require.resolve("./env")];
            delete process.env["TOKEN_KEY"];
            let env = require("./env").env;
            const firstValue = env.TOKEN_KEY;
            expect(firstValue.length).toEqual(43);

            delete process.env["TOKEN_KEY"];
            delete require.cache[require.resolve("./env")];
            env = require("./env").env;
            const secondValue = env.TOKEN_KEY;
            expect(secondValue.length).toEqual(43);

            expect(secondValue).not.toEqual(firstValue);
        });

        it("value", () => {
            process.env["TOKEN_KEY"] = "overwritten";
            const { env } = require("./env");
            expect(env.TOKEN_KEY).toEqual(process.env["TOKEN_KEY"]);
        });
    });
});
