import { DbWrapper } from 'wrapper';
import { mockDb } from './mock-db';

type Public<T> = Pick<T, keyof T>;

/**
 * Mock `@webscaledev/hdb-wrapper/hdbext`. Make sure to call this function before any imports!!
 *
 * @param virtual if set, the module does not need to be present in node_modules, to be mocked
 */
export function mockConnections(virtual?: boolean) {
    jest.mock('@webscaledev/hdb-wrapper/hdbext', () => ({
        getConnection() { return Promise.resolve(mockDb); },
        withDb(_options: any, fn: (db: Public<DbWrapper>) => Promise<unknown>) { return fn(mockDb); },
        dbWrapperMiddleware(req: any, _res: unknown, next: import('express').NextFunction) { req.wrappedDb = mockDb; next(); }
    }), { virtual });
}
