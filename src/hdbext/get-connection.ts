import { createConnection } from '@sap/hdbext';
import { promisify } from 'util';
import { DbWrapper } from '../wrapper';

export function getConnection(options: import('hdb').ConnectionOptions) {
    return promisify(createConnection)(options);
}

export async function withDb<T = unknown>(options: import('hdb').ConnectionOptions, fn: (db: DbWrapper) => T | Promise<T>) {
    const connection = await getConnection(options);
    try {
        const db = new DbWrapper(connection);
        return await fn(db);
    } finally {
        connection.close();
    }
}
