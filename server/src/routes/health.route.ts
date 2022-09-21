import express from "express";

export default healthRoute;

function healthRoute(_req: express.Request, res: express.Response) {
    return res.status(200).end("healthy");
}
