/**
 * A sparse type definition for @sap/hdbext. Only the used options are declared here.
 */
declare module '@sap/hdbext' {

    export interface PoolOptions {
        /** @default 100 */
        max?: number;
        /** @default 0 */
        min?: number;
        /** @default 10_000 */
        idleTimeoutMillis?: number;
        /** @default false */
        log?: boolean;
        /** @default false */
        refreshIdle?: boolean;
    }

    export interface ConnectionPool {
        acquire(options: unknown, cb: import('hdb').Callback<import('hdb').Connection>): void;
        /**
         * If the client is no longer needed, release it to the connection pool.
         * *Hint: Alternatively, you can close the client connection with `client.close()`*
         */
        releqse(client: import('hdb').Connection): void;

        /** When the pool is no longer needed, you can dispose of the idle connections by draining the pool */
        drain(): void;
    }

    /** Create a Database Connection */
    export function createConnection(options: import('hdb').ConnectionOptions, callback: import('hdb').Callback<import('hdb').Connection>): void;

    /** Create a new database ConnectionPool for the given hana service/connectionOptions */
    export function createPool(options: import('hdb').ConnectionOptions, poolOptions?: PoolOptions): ConnectionPool;
    /** Get an existing or create a new database ConnectionPool for the given hana service/connectionOptions */
    export function getPool(options: import('hdb').ConnectionOptions, poolOptions?: PoolOptions): ConnectionPool;

    /** Adds a middleware Handler to express that gets a HDB Client from a pool and adds it to every request at `req.db` */
    export function middleware(options: import('hdb').ConnectionOptions, poolOptions?: PoolOptions): import('express').Handler;
}

declare namespace Express {
    export interface Request {
        /** Only available if @sap/hdbext#middleware() is used before this request */
        db: import('hdb').Connection;
    }
}
