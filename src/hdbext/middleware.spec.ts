import { DbWrapper } from '../wrapper';
import { dbWrapperMiddleware } from './middleware';

describe(dbWrapperMiddleware, () => {
    const param = {} as any;

    it('should throw if no `db` is present in the given request', () => {
        expect(() => dbWrapperMiddleware(param, param, param))
            .toThrow(`Property 'db' not found in request, have you added '@sap/hdbext'.middleware() as middleware?`);
    });

    it('should set a `DbWrapper` on the request', () => {
        const fakeClient = {} as any;
        const fakeRequest = {
            db: fakeClient,
        } as any;
        const next = jest.fn();
        dbWrapperMiddleware(fakeRequest, param, next);
        expect(next).toHaveBeenCalledWith();
        expect(fakeRequest).toHaveProperty('wrappedDb', expect.any(DbWrapper));
    });
});
