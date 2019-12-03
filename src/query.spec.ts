import * as queries from './query';

describe(queries.select, () => {
    it('should be able to determine the returned columns', () => {
        const { query, values } = queries.select('myTable', { columns: ['ID'] });
        expect(query).toBe(`SELECT "ID" FROM "myTable"`);
        expect(values).toEqual([]);
    });

    it('should be able to use a simple where', () => {
        const { query, values } = queries.select('myTable', { where: { ID: 'myValue' } });
        expect(query).toBe(`SELECT * FROM "myTable" WHERE "ID" = ?`);
        expect(values).toEqual(['myValue']);
    });

    it('should be able to use a simple orderBy', () => {
        const { query, values } = queries.select('myTable', { orderBy: ['ID'] });
        expect(query).toBe(`SELECT * FROM "myTable" ORDER BY "ID"`);
        expect(values).toEqual([]);
    });

    it('should be able to use a simple join', () => {
        const { query, values } = queries.select('myTable', { join: { table: 'secondTable', onEquals: { ID: 'FOREIGN_KEY' } } });
        expect(query).toBe(`SELECT * FROM "myTable" INNER JOIN "secondTable" ON "secondTable"."ID" = "FOREIGN_KEY"`);
        expect(values).toEqual([]);
    });

    it('should be able to create an advanced query', () => {
        const { query, values } = queries.select('myTable', {
            columns: ['STATUS_ID', { table: 'secondTable', name: 'CHANGED_ON' }],
            join: { type: 'LEFT', table: 'secondTable', onEquals: { OBJECT_ID: { table: 'myTable', name: 'ID' } } },
            orderBy: ['STATUS_ID', { column: { table: 'myTable', name: 'ID' }, direction: 'DESC' }],
        });
        expect(query).toBe(`SELECT "STATUS_ID", "secondTable"."CHANGED_ON" `
            + `FROM "myTable" LEFT JOIN "secondTable" ON "secondTable"."OBJECT_ID" = "myTable"."ID" `
            + `ORDER BY "STATUS_ID", "myTable"."ID" DESC`);
        expect(values).toEqual([]);
    });
});
describe(queries.insert, () => {
    it('should create a valid `INSERT` statement', () => {
        const { query, values } = queries.insert('myTable', [{ FIRST_PROP: 'newData', SECOND_PROP: 2 }]);
        expect(query).toBe(`INSERT INTO "myTable" ("FIRST_PROP","SECOND_PROP") VALUES (?,?)`);
        expect(values).toEqual([['newData', 2]]);
    });

    it('should be able to add multiple entries', () => {
        const { query, values } = queries.insert('myTable', [
            { FIRST_PROP: 'first', SECOND_PROP: 1 },
            { FIRST_PROP: 'second', SECOND_PROP: 2 },
            { FIRST_PROP: 'third', SECOND_PROP: 3 }
        ]);
        expect(query).toBe(`INSERT INTO "myTable" ("FIRST_PROP","SECOND_PROP") VALUES (?,?)`);
        expect(values).toEqual([['first', 1], ['second', 2], ['third', 3]]);
    });
});

describe(queries.update, () => {
    it('should return an empty object if no data is given', () => {
        expect(queries.update('myTable', { ID: 'myId' }, {})).toEqual({});
    });

    it('should throw an error if there is no where clause', () => {
        expect(() => queries.update('myTable', {}, { SOME: 'prop' }))
            .toThrow(`Cannot UPDATE on 'myTable' without a valid where clause`);
        expect(() => queries.update('myTable', { ID: undefined }, { SOME: 'prop' }))
            .toThrow(`Cannot UPDATE on 'myTable' without a valid where clause`);
    });

    it('should ignore undefined values in the data', () => {
        expect(queries.update('myTable', { ID: 'myId' }, { FIRST_PROP: undefined, SECOND_PROP: undefined } as any)).toEqual({});

        const { query, values } = queries.update('myTable', { ID: 'myId' }, { FIRST_PROP: 'newData', SECOND_PROP: undefined } as any);
        expect(query).toBe(`UPDATE "myTable" SET "FIRST_PROP" = ? WHERE "ID" = ?`);
        expect(values).toEqual(['newData', 'myId']);
    });

    it('should create a valid `UPDATE` statement', () => {
        const { query, values } = queries.update('myTable', { ID: 'myId' }, { FIRST_PROP: 'newData', SECOND_PROP: 2 });
        expect(query).toBe(`UPDATE "myTable" SET "FIRST_PROP" = ?,"SECOND_PROP" = ? WHERE "ID" = ?`);
        expect(values).toEqual(['newData', 2, 'myId']);
    });
});

describe(queries.deleteFn, () => {
    it('should create a valid `DELETE` statement', () => {
        const { query, values } = queries.deleteFn('myTable', {
            ID: 'myId'
        });
        expect(query).toBe(`DELETE FROM "myTable" WHERE "ID" = ?`);
        expect(values).toEqual(['myId']);
    });

    it('should throw an error if there is no where clause', () => {
        expect(() => queries.deleteFn('myTable', {}))
            .toThrow(`Cannot DELETE on 'myTable' without a valid where clause`);
        expect(() => queries.deleteFn('myTable', { ID: undefined }))
            .toThrow(`Cannot DELETE on 'myTable' without a valid where clause`);
    });
});
