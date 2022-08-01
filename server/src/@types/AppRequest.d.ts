import express from "express";

export type AppRequest = express.Request & {
    relativePath: string;
    absolutePath: string;
}
