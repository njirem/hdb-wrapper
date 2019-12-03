export type Primitive = string | number | boolean | null | undefined;
export interface Data {
    [column: string]: Primitive;
}

type HanaClientCallBack = (error: Error | null) => void;
type HanaResultCallBack<T> = (error: Error | null, results: T) => void;
type HanaStatementCallBack = (error: Error | null, stmt: Statement) => void;

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
    exec<T>(params: Data | Primitive[] | Primitive[][], fn: HanaResultCallBack<T>): void;
    drop(fn: HanaClientCallBack): void;
}

export interface Connection {
    connect(options: ConnectionOptions, fn: HanaClientCallBack): void;
    disconnect(fn: HanaClientCallBack): void;
    exec<T>(sql: string, fn: HanaResultCallBack<T>): void;
    exec<T>(sql: string, params: any | any[], fn: HanaResultCallBack<T>): void;
    prepare(sql: string, fn: HanaStatementCallBack): void;
    setAutoCommit(autoCommit: boolean): void;
    commit(fn: HanaClientCallBack): void;
    rollback(fn: HanaClientCallBack): void;
    /** Disconnects from the database, in case of a connectionPool it will release the connection to the pool */
    close(): void;
}
