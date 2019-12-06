declare module 'hdb' {
    export type Primitive = string | number | boolean | null | undefined;
    export interface Data {
        [column: string]: Primitive;
    }

    type Callback<T = undefined> = (error: Error | null, results: T) => void;

    interface ConnectionOptions {
        host: string;
        port: number;
        uid: string;
        pwd: string;
        serverNode?: string;
        schema?: string;
        databaseName?: string;
        autoCommit?: boolean;
    }

    interface Statement {
        exec<T>(params: Data | Primitive[] | Primitive[][], fn: Callback<T>): void;
        drop(fn: Callback): void;
    }

    export interface Connection {
        connect(options: ConnectionOptions, fn: Callback): void;
        disconnect(fn: Callback): void;
        exec<T>(sql: string, fn: Callback<T>): void;
        exec<T>(sql: string, params: any | any[], fn: Callback<T>): void;
        prepare(sql: string, fn: Callback<Statement>): void;
        setAutoCommit(autoCommit: boolean): void;
        commit(fn: Callback): void;
        rollback(fn: Callback): void;
        /** Disconnects from the database, in case of a connectionPool it will release the connection to the pool */
        close(): void;
    }
}
