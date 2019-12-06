import { DbWrapper } from '../wrapper';

/**
 * Adds the DbWrapper to the request object.
 * Assumes `@sap/hdbext#middleware()` is used before this middleware
 */
export function dbWrapperMiddleware(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) {
    if (!req.db) { throw new Error(`Property 'db' not found in request, have you added '@sap/hdbext'.middleware() as middleware?`); }
    req.wrappedDb = new DbWrapper(req.db);
    next();
}

declare module 'express' {
    export interface Request {
        wrappedDb: DbWrapper;
    }
}
