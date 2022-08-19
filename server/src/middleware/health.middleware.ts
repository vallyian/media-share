import express from "express";

export default healthMiddleware;

function healthMiddleware(_req: express.Request, res: express.Response) {
    return res.status(200).end("healthy");
}
