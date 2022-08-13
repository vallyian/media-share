import { NextFunction, Request, Response } from "express";

import * as renderService from "../services/render.service";

export function faviconMiddleware(_req: Request, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => renderService.renderIcon("share-fill", { fill: "#0080FF" }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => next(err));
}
