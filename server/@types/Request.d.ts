import express from "express";

type Request = express.Request & {
    relativePath: string,
    absolutePath: string
}
