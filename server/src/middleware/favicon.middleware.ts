import { NextFunction, Request, Response } from "express";

export function faviconMiddleware(_req: Request, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => res
            .set("Cache-Control", "public, max-age=31557600")
            .render("icons/share-fill", { fill: "#0080FF" }))
        .catch(err => next(err));
}
