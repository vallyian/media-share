import { Request, Response, NextFunction } from "express";
import { v2 as webdav } from "webdav-server";

export function WebdavMiddleware(
    config: {
        authDav: string[],
        mediaDir: string,
        proxyLocation: string
    }
) {
    const webdavHandler = getWebdavServer()
        .then(webdavServer => webdav.extensions.express("/", webdavServer))
        .catch(err => <Error>err);

    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        return webdavHandler
            .then(handler => handler instanceof Error ? Promise.reject(handler) : handler)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            .then(handler => handler(req, res, next))
            .catch(err => next(err));
    }

    function getWebdavServer() {
        return new Promise<webdav.WebDAVServer>((ok, reject) => {
            const authDav = config.authDav.map(c => {
                const cred = c.split(":");
                return {
                    user: <string>cred[0],
                    pass: <string>cred[1],
                    privileges: ["canRead"].concat(cred[2] === "rw" ? ["canWrite"] : [])
                };
            }).filter(a => a.user && a.pass && a.privileges.length);

            if (!authDav.length)
                return reject(Error("dav users config invalid"));

            const userManager = new webdav.SimpleUserManager();
            const privilegeManager = new webdav.SimplePathPrivilegeManager();
            authDav.forEach(a => privilegeManager.setRights(
                userManager.addUser(a.user, a.pass, false),
                config.proxyLocation,
                a.privileges
            ));
            const webdavServer = new webdav.WebDAVServer({
                httpAuthentication: new webdav.HTTPDigestAuthentication(userManager, "Default realm"),
                privilegeManager
            });

            webdavServer.setFileSystem(
                config.proxyLocation /* TODO: config.proxyLocation */,
                new webdav.PhysicalFileSystem(config.mediaDir),
                success => success
                    ? ok(webdavServer)
                    : reject(Error("webdavServer.setFileSystem error"))
            );
        });
    }
}
