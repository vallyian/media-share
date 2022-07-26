import { Request, Response } from "express";

export function healthMiddleware(req: Request, res: Response) {
    return res.status(200).end(req.protocol);
}
