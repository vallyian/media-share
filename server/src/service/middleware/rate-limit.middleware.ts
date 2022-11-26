import rateLimit from "express-rate-limit";

export function RateLimitMiddleware(
    config: {
        rateLimitPerSecond: number,
        rateLimitBurstFactor: number,
        rateLimitPeriodMinutes: number,
    }
) {
    const burstHandler = rateLimit({
        windowMs: 1000,
        max: config.rateLimitPerSecond * config.rateLimitBurstFactor,
        handler: (_req, _res, next, options) => {
            const err = Error(options.message);
            err.cause = "Max no of requests per second exceeded";
            err.status = options.statusCode;
            next(err);
        }
    });

    const periodHandler = rateLimit({
        windowMs: 60 * config.rateLimitPeriodMinutes * 1000,
        max: config.rateLimitPerSecond * 60 * config.rateLimitPeriodMinutes,
        handler: (_req, _res, next, options) => {
            const err = Error(options.message);
            err.cause = "Max no of requests per period exceeded";
            err.status = options.statusCode;
            next(err);
        }
    });

    return [burstHandler, periodHandler];
}
