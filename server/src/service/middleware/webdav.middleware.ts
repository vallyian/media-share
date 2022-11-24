import { Request, Response, NextFunction } from "express";
import { v2 as webdav } from "webdav-server";

export function WebdavMiddleware(
    config: {
        authDav: string[],
        mediaDir: string
    }
) {
    const webdavHandlerPromise = new Promise<ReturnType<typeof webdav.extensions.express> | Error>(ok => {
        const authDav = config.authDav.map(c => {
            const cred = c.split(":");
            return {
                user: <string>cred[0],
                pass: <string>cred[1]
            };
        }).filter(a => a.user && a.pass);

        if (!authDav.length)
            return ok(Error("dav users config invalid"));

        const userManager = new webdav.SimpleUserManager();
        const privilegeManager = new webdav.SimplePathPrivilegeManager();
        authDav.forEach(a => privilegeManager.setRights(userManager.addUser(a.user, a.pass, false), "/", ["all"]));
        const webdavServer = new webdav.WebDAVServer({
            httpAuthentication: new webdav.HTTPDigestAuthentication(userManager, "Default realm"),
            privilegeManager
        });

        webdavServer.setFileSystem("/", new webdav.PhysicalFileSystem(config.mediaDir), success => success
            ? ok(webdav.extensions.express("/", webdavServer))
            : ok(Error("webdavServer.setFileSystem error")));
    });

    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        try {
            const webdavHandler = await webdavHandlerPromise;
            return webdavHandler instanceof Error
                ? next(webdavHandler)
                : webdavHandler(req, res, next);
        } catch (ex) {
            return next(ex);
        }
    }
}
