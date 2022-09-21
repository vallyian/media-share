import express from "express";

export default faviconRoute;

function faviconRoute(_req: express.Request, res: express.Response, next: express.NextFunction) {
    return Promise.resolve()
        .then(() => res
            .set("Cache-Control", "public, max-age=31557600")
            .render("icons/share-fill", { fill: "#0080FF" }))
        .catch(err => next(err));
}
