import { Request, Response, NextFunction } from "express";

export function FaviconRoute() {
    return handler;

    function handler(_req: Request, res: Response, next: NextFunction) {
        try {
            return res
                .set("Cache-Control", "public, max-age=31557600")
                .type(".svg")
                .render("icons/share-fill", { fill: "#0080FF" });
        } catch (ex) {
            return next(ex);
        }
    }
}
