import { mockDb } from './mock-db';
import { mockConnections } from './wrapper-hdbext-mock';
mockConnections(true);

// tslint:disable-next-line: no-var-requires
const { dbWrapperMiddleware, getConnection, withDb } = require('@webscaledev/hdb-wrapper/hdbext') as typeof import('../hdbext');

describe(dbWrapperMiddleware, () => {
    it('should add the mockDb to a request', () => {
        const req = {} as any;
        const res = {} as any;
        const next = jest.fn();
        dbWrapperMiddleware(req, res, next);
        expect(next).toHaveBeenLastCalledWith();
        expect(Object.keys(res)).toHaveLength(0);
        expect(req).toHaveProperty('wrappedDb', mockDb);
    });
});

describe(getConnection, () => {
    it('should resolve with the mockDb', async () => {
        await expect(getConnection({} as any)).resolves.toBe(mockDb);
    });
});

describe(withDb, () => {
    it('should give the mockDb as parameter', () => {
        const fn = jest.fn();
        withDb({} as any, fn);
        expect(fn).toHaveBeenCalledWith(mockDb);
    });

    it('should still return the returned Promise from the given function', async () => {
        const fn = jest.fn().mockResolvedValue('foo');
        await expect(withDb({} as any, fn)).resolves.toBe('foo');
    });
});
