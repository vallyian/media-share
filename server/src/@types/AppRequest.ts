import * as express from "express";

export type AppRequest = express.Request & {
    user?: string;
};
