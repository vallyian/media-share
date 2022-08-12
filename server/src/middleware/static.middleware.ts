import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { env } from "../env";
import * as renderService from "../services/render.service";
import * as fsService from "../services/fs.service";
import * as sanitizeService from "../services/sanitize.service";

export function favicon(_req: Request, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => renderService.renderIcon("share-fill", { fill: "#0080FF" }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => {
            console.error(err);
            return next(err);
        });
}

export function appScript(req: Request, res: Response, next: NextFunction) {
    const scriptName = sanitizeService.params(req).script;
    let scriptPath: string;
    return Promise.resolve()
        .then(() => scriptName || Promise.reject("param script invalid or not set"))
        .then(() => scriptPath = path.join(env.VIEWS_DIR, "scripts", scriptName))
        .then(() => fsService.fileExists(scriptPath))
        .then(exists => exists || Promise.reject(`script file "${scriptPath}" not found`))
        .then(() => res.sendFile(scriptPath, { root: process.cwd() }))
        .catch(err => {
            console.error(err);
            return next(err);
        });
}
