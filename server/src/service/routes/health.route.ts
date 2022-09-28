import { Request, Response } from "express";

export class HealthRoute {
    handler(_req: Request, res: Response) {
        return res.status(200).end("healthy");
    }
}
