import { Request } from "express";

export type AppRequest = Request & {
    relativePath: string;
    mediaPath: string;
    stat: Stat;
    isStatic: boolean;
}

export type Stat = "file" | "dir" | "error" | "unknown";
