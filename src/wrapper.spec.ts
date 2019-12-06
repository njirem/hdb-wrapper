import { Connection, Primitive } from 'hdb';
import { DbWrapper } from './wrapper';

describe(DbWrapper, () => {
    let client: FakeClient;
    let db: DbWrapper;
    beforeEach(() => {
        client = new FakeClient();
        db = new DbWrapper(client);
    });

    it('should be able to be constructed', () => {
        expect(db).toBeTruthy();
    });

    const where = { firstName: 'Piet' };
    const data = { lastName: 'Paulusma' };

    describe('timestamp', () => {
        it('should return a predictable timestamp', async () => {
            const time = db.timestamp;
            expect(time).toBeTruthy();

            await milliseconds(1);

            expect(db.timestamp).toBe(time);
        });

        it('should reset at commit (even if the commit wont go through)', async () => {
            const time = db.timestamp;

            await db.commit();
            await milliseconds(10);

            expect(db.timestamp).not.toBe(time);
        });
    });

    // Note that the query builder is tested elsewhere...
    describe('select', () => {
        it('should be able to select', async () => {
            await db.select('myTable');
            expect(client.exec).toHaveBeenCalledWith(
                'SELECT * FROM "myTable"', expect.anything(),
            );
        });

        it('should be able to select with options', async () => {
            await db.select('myTable', { where });
            client.expectPreparedStatement({
                sql: `SELECT * FROM "myTable" WHERE "firstName" = ?`,
                params: ['Piet'],
            });
        });

        it('should return an array, even if nothing returns from the client callback', async () => {
            client.exec.mockImplementationOnce((_, cb) => cb(null));
            await expect(db.select('myTable')).resolves.toEqual([]);
        });

        it('should rethrow a wrapped error, if something fails', async () => {
            client.prepare.mockImplementationOnce((_, cb) => cb(new Error('Prepare failed')));
            await expect(db.select('myTable.MYTABLE', { where })).rejects
                .toThrow(`Unexpected error Selecting from 'myTable.MYTABLE'
Error: Error while executing:
SELECT * FROM "myTable.MYTABLE" WHERE "firstName" = ?
Error: Prepare failed`);
        });
    });

    describe('insert', () => {
        it('should be able to insert data', async () => {
            await db.insert('myTable', data);
            client.expectPreparedStatement({
                sql: 'INSERT INTO "myTable" ("lastName") VALUES (?)',
                params: [['Paulusma']],
            });
        });

        it('should be able to insert multiple entries', async () => {
            await db.insert('myTable', [data, data, data]);
            client.expectPreparedStatement({
                sql: 'INSERT INTO "myTable" ("lastName") VALUES (?)',
                params: [['Paulusma'], ['Paulusma'], ['Paulusma']],
            });
        });

        it('should do nothing if no data is given', async () => {
            await expect(db.insert('myTable', [])).resolves.toEqual([]);
            expect(client.prepare).not.toHaveBeenCalled();
            expect(client.exec).not.toHaveBeenCalled();
        });

        it('should be able to immediately retrieve the inserted data', async () => {
            await db.insert('myTable', { ...data, uniqueProp: 1 }, 'uniqueProp');
            expect(client.prepare).toHaveBeenCalledTimes(2);
            client.expectPreparedStatement({
                sql: 'SELECT * FROM "myTable" WHERE "uniqueProp" IN (?)',
                params: [1],
            });

            client.prepare.mockClear();
            await db.insert('myTable', [
                { ...data, uniqueProp: 2 },
                { ...data, uniqueProp: 3 },
                { ...data, uniqueProp: 4 },
            ], 'uniqueProp');
            expect(client.prepare).toHaveBeenCalledTimes(2);
            client.expectPreparedStatement({
                sql: 'SELECT * FROM "myTable" WHERE "uniqueProp" IN (?,?,?)',
                params: [2, 3, 4],
            });
        });

        it('should rethrow a wrapped error, if something fails', async () => {
            client.prepare.mockImplementationOnce((_, cb) => cb(new Error('Prepare failed')));
            await expect(db.insert('myTable.MYTABLE', data)).rejects
                .toThrow(`Unexpected error Inserting into 'myTable.MYTABLE'
Error: Error while executing:
INSERT INTO "myTable.MYTABLE" ("lastName") VALUES (?)
Error: Prepare failed`);
        });
    });

    describe('delete', () => {
        it('should be able to delete a single entry', async () => {
            await db.delete('myTable', where);
            client.expectPreparedStatement({
                sql: 'DELETE FROM "myTable" WHERE "firstName" = ?',
                params: [where.firstName],
            });
        });

        it('should be able to delete a multiple entries', async () => {
            const firstName = ['Piet', 'Klaas', 'Henk'];
            await db.delete('myTable', { firstName });
            client.expectPreparedStatement({
                sql: 'DELETE FROM "myTable" WHERE "firstName" IN (?,?,?)',
                params: firstName,
            });
        });

        it('should rethrow a wrapped error, if something fails', async () => {
            client.prepare.mockImplementationOnce((_, cb) => cb(new Error('Prepare failed')));
            await expect(db.delete('myTable.MYTABLE', where)).rejects
                .toThrow(`Unexpected error Deleting from 'myTable.MYTABLE'
Error: Error while executing:
DELETE FROM "myTable.MYTABLE" WHERE "firstName" = ?
Error: Prepare failed`);
        });
    });

    describe('update', () => {
        it('should be able to update', async () => {
            await db.update('myTable', where, data);
            expect(client.prepare).toHaveBeenCalledWith(
                'UPDATE "myTable" SET "lastName" = ? WHERE "firstName" = ?', expect.anything());
            expect(client.preparedStatement.exec)
                .toHaveBeenCalledWith(['Paulusma', 'Piet'], expect.anything());
        });
        it('should rethrow a wrapped error, if something fails', async () => {
            client.prepare.mockImplementationOnce((_, cb) => cb(new Error('Prepare failed')));
            await expect(db.update('myTable.MYTABLE', where, data)).rejects
                .toThrow(`Unexpected error Updating in 'myTable.MYTABLE'
Error: Error while executing:
UPDATE "myTable.MYTABLE" SET "lastName" = ? WHERE "firstName" = ?
Error: Prepare failed`);
        });
        it('should do nothing if there is nothing to update', async () => {
            await db.update('myTable', where, { lastName: undefined });
            await db.update('myTable', where, {});
            expect(client.prepare).not.toHaveBeenCalled();
        });
    });

    describe('commit', () => {
        it('should not commit if there are no active changes', async () => {
            await db.commit();
            expect(client.commit).not.toHaveBeenCalled();
        });

        it('should be able to force a commit without active changes', async () => {
            await db.commit(true);
            expect(client.commit).toHaveBeenCalled();
        });

        it('should be able to commit with active changes', async () => {
            await db.insert('myTable', [{ some: 'data' }]);
            await db.commit();
            expect(client.commit).toHaveBeenCalled();
        });

        it('should use active changes for errors', async () => {
            const table = 'myTable';
            const data = { some: 'data' };
            await db.insert(table, data);
            client.commit.mockImplementationOnce(cb => cb(new Error('Client Commit Failed')));
            await expect(db.commit()).rejects
                .toThrow(`Commit failed!
Error: Client Commit Failed
Pending changes:
INSERT-myTable`);
        });
    });

    describe('rollback', () => {
        it('should not rollback if there are no active changes', async () => {
            await db.rollback();
            expect(client.rollback).not.toHaveBeenCalled();
        });

        it('should be able to force a rollback without active changes', async () => {
            await db.rollback(true);
            expect(client.rollback).toHaveBeenCalled();
        });

        it('should be able to rollback with active changes', async () => {
            await db.insert('myTable', [{ some: 'data' }]);
            await db.rollback();
            expect(client.rollback).toHaveBeenCalled();
        });

        it('should use active changes for errors', async () => {
            const table = 'myTable';
            const data = { some: 'data' };
            await db.insert(table, data);
            client.rollback.mockImplementationOnce(cb => cb(new Error('Client Rollback Failed')));
            await expect(db.rollback()).rejects
                .toThrow(`Rollback failed!
Error: Client Rollback Failed
Pending changes:
INSERT-myTable`);
        });
    });

    describe('execute', () => {
        describe('with params', () => {
            const sql = 'SELECT * WHERE params = ?';
            const params = [true];

            it('should be able to execute sql', async () => {
                const result = await db.execute(sql, params);
                expect(result).toHaveLength(1);
                client.expectPreparedStatement({ sql, params });
            });

            it('should drop the statement afterwards', async () => {
                await db.execute(sql, params);
                expect(client.preparedStatement.drop).toHaveBeenCalled();
            });

            it('should produce a logical error message when prepare or execute fails', async () => {
                client.prepare.mockImplementationOnce((_, cb) => cb(new Error('prepare failed')));
                await expect(db.execute(sql, params)).rejects.toThrow(
                    `Error while executing:\n${sql}\nError: prepare failed`
                );

                client.preparedStatement.exec.mockImplementationOnce((_, cb) => cb(new Error('exec failed')));
                await expect(db.execute(sql, params)).rejects.toThrow(
                    `Error while executing:\n${sql}\nError: exec failed`
                );
            });
        });

        describe('without params', () => {
            const sql = 'SELECT * WHERE params = false';

            it('should be able to execute sql', async () => {
                const result = await db.execute(sql);
                expect(result).toHaveLength(1);
                expect(client.exec).toHaveBeenCalledWith(sql, expect.anything());
            });

            it('should produce a logical error message', async () => {
                client.exec.mockImplementationOnce((_, cb) => cb(new Error('exec failed')));
                await expect(db.execute(sql)).rejects.toThrow(
                    `Error while executing:\n${sql}\nError: exec failed`
                );
            });
        });
    });
});

type CB = (error: Error | null, result?: any) => void;
class FakeClient implements Connection {
    readonly exec = jest.fn((sql: string, cb: CB) => {
        // for the _primaryKey method
        if (sql.includes('"COLUMN_NAME" FROM "SYS"')) {
            cb(null, [{ COLUMN_NAME: 'ID' }]);
        } else {
            cb(null, [{ result: 'executed result' }]);
        }
    });
    readonly commit = jest.fn((cb: CB) => cb(null));
    readonly rollback = jest.fn((cb: CB) => cb(null));
    readonly prepare = jest.fn((_sql: string, cb: CB) => cb(null, this.preparedStatement));
    readonly preparedStatement = {
        exec: jest.fn((_params: any[], cb: CB) => cb(null, [{ result: 'prepared result' }])),
        drop: jest.fn(cb => cb()),
    };

    expectPreparedStatement({ sql, params }: { sql?: string; params?: Primitive[] | Primitive[][] } = {}) {
        expect(this.prepare).toHaveBeenLastCalledWith(
            sql && expect.stringContaining(sql) || expect.anything(), expect.anything()
        );
        expect(this.preparedStatement.exec).toHaveBeenLastCalledWith(
            params || expect.anything(), expect.anything(),
        );
    }

    // Unused by us
    readonly close = jest.fn();
    readonly setAutoCommit = jest.fn();
    readonly connect = jest.fn();
    readonly disconnect = jest.fn();
}

function milliseconds(ms?: number) {
    return new Promise(r => setTimeout(r, ms));
}
