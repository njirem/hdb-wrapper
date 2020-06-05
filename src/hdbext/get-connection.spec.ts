jest.mock('@sap/hdbext', () => {
    const connection = { connected: true, close: jest.fn() };
    return {
        createConnection: jest.fn().mockImplementation((_options, cb) => cb(null, connection)),
        connection,
    };
}, { virtual: true });

import { DbWrapper } from '../wrapper';
import { getConnection, withDb } from './get-connection';

// tslint:disable-next-line: no-var-requires
const hdbext = require('@sap/hdbext');

describe(getConnection, () => {
    const options = {} as any;

    it('should get the connection with the given options', async () => {
        await expect(getConnection(options)).resolves.toBe(hdbext.connection);
        expect(hdbext.createConnection).toHaveBeenCalledWith(options, expect.anything());
    });
});

describe(withDb, () => {
    const options = {} as any;
    const fn = jest.fn();

    it('should give a dbWrapper to the given function', async () => {
        await withDb(options, fn);
        expect(hdbext.createConnection).toHaveBeenCalled();
        expect(fn).toHaveBeenCalledWith(expect.any(DbWrapper));
    });

    it('should be able to get the underlying connection from a pool', async () => {
        await withDb(options, fn);
        expect(fn).toHaveBeenCalledWith(expect.any(DbWrapper));
    });

    it('should wait for the function to finish and then call close', async () => {
        fn.mockImplementationOnce(async () => {
            await Promise.resolve();
            expect(hdbext.connection.close).not.toHaveBeenCalled();
        });
        await withDb(options, fn);
        expect(hdbext.connection.close).toHaveBeenCalled();
    });

    it('should return the returned value of the function', async () => {
        fn.mockResolvedValueOnce('foo');
        await expect(withDb(options, fn)).resolves.toBe('foo');
    });
});
