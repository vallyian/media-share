import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { renderIcon } from "../services/render.service";
import { fileExists } from "../services/fs.service";
import { env } from "../env";
import { requestParam } from "../services/sanitizer.service";

export function favicon(_req: Request, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => renderIcon("share-fill", { fill: "#0080FF" }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => {
            console.error(err);
            return next(err);
        });
}

export function appScript(req: Request, res: Response, next: NextFunction) {
    const scriptName = requestParam(req, "script");
    let scriptPath: string;
    return Promise.resolve()
        .then(() => scriptName || Promise.reject(`param script "${scriptName}" invalid or not set`))
        .then(() => scriptPath = path.join(env.VIEWS_DIR, "scripts", <string>scriptName))
        .then(() => fileExists(scriptPath))
        .then(exists => exists || Promise.reject(`script file "${scriptPath}" not found`))
        .then(() => res.sendFile(scriptPath, { root: process.cwd() }))
        .catch(err => {
            console.error(err);
            return next(err);
        });
}
