import { Request } from "express";

export type AppRequest = Request & {
    user?: string;
};
