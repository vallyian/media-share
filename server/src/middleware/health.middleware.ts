import { Request, Response } from "express";

export function healthMiddleware(_req: Request, res: Response) {
    return res.status(200).end("healthy");
}
