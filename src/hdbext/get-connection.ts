import { createConnection, getPool } from '@sap/hdbext';
import { promisify } from 'util';
import { DbWrapper } from '../wrapper';

export function getConnection(options: import('hdb').ConnectionOptions, fromPool?: boolean) {
    if (fromPool) {
        const pool = getPool(options);
        return promisify(pool.acquire).call(pool, {});
    }
    return promisify(createConnection)(options);
}

export async function withDb<T = unknown>(options: import('hdb').ConnectionOptions, fn: (db: DbWrapper) => Promise<T>, pool = false) {
    const connection = await getConnection(options, pool);
    try {
        const db = new DbWrapper(connection);
        return await fn(db);
    } finally {
        connection.close();
    }
}
