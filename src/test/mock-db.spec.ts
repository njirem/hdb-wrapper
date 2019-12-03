import { mockDb } from './mock-db';

describe('mockDb', () => {
    interface Meteoroloog {
        firstName: string;
        lastName: string;
        birthYear: number;
    }
    const myTable = 'meteorologen';
    const pietData: Meteoroloog = { firstName: 'Piet', lastName: 'Paulusma', birthYear: 1956 };
    const meteorologenData: Meteoroloog[] = [
        pietData,
        { firstName: 'John', lastName: 'Bernard', birthYear: 1937 },
        { firstName: 'Monique', lastName: 'Somers', birthYear: 1963 },
        { firstName: 'Diana', lastName: 'Woei', birthYear: 1965 },
    ];
    beforeEach(() => mockDb.insert('meteorologen', meteorologenData));

    interface Temperatuur {
        year: number;
        avg: number;
    }
    const temperatuurData: Temperatuur[] = [
        { year: 1937, avg: 9.5 },
        { year: 1938, avg: 9.7 },
        { year: 1939, avg: 9.6 },
        { year: 1956, avg: 8.1 },
        { year: 1963, avg: 7.8 },
        { year: 1966, avg: 9.4 },
    ];
    beforeEach(() => mockDb.insert('temperaturen', temperatuurData));

    describe(mockDb.insert, () => {
        it('should be able to insert a single object', () => {
            mockDb.insert('myTable', { foo: 'bar' });
            const table = mockDb.getTable('myTable');
            expect(table).toEqual([{
                ID: expect.anything(),
                foo: 'bar',
            }]);
        });

        it('should be able to insert multiple objects', () => {
            mockDb.insert('myTable', [{ foo: 'foo' }, { bar: 'bar' }, { baz: 'baz' }]);
            const table = mockDb.getTable('myTable');
            expect(table).toEqual([{
                ID: expect.anything(),
                foo: 'foo',
            }, {
                ID: expect.anything(),
                bar: 'bar',
            }, {
                ID: expect.anything(),
                baz: 'baz',
            }]);

            // No IDs should be the same!
            expect(table[0].ID).not.toBe(table[1].ID);
            expect(table[0].ID).not.toBe(table[2].ID);
            expect(table[1].ID).not.toBe(table[2].ID);
        });

        it('should return the inserted values', async () => {
            const values = await mockDb.insert('myTable', [{ foo: 'foo' }, { bar: 'bar' }, { baz: 'baz' }]);
            const table = mockDb.getTable('myTable');
            expect(table).toEqual(values);
        });

        it('should be able to insert into multiple tables', async () => {
            await mockDb.insert('myTable', { foo: 'bar' });
            await mockDb.insert('myOtherTable', { bar: 'baz' });
            expect(mockDb.getTable('myTable')).toHaveLength(1);
            expect(mockDb.getTable('myOtherTable')).toHaveLength(1);
            expect(mockDb.getTable(myTable)).toHaveLength(4);
        });
    });

    describe(mockDb.delete, () => {
        it('should be able to remove a specific entry', async () => {
            await mockDb.delete(myTable, { firstName: 'Piet' });

            const table = mockDb.getTable(myTable);
            expect(table).toHaveLength(3);
            expect(table)
                .not.toContainEqual(expect.objectContaining({ firstName: 'Piet' }));
            expect(table)
                .toContainEqual(expect.objectContaining({ firstName: 'Diana' }));
        });

        it('should be able to remove multiple entries', async () => {
            await mockDb.delete(myTable, { firstName: ['Piet', 'Diana'] });

            const table = mockDb.getTable(myTable);
            expect(table).toHaveLength(2);
            expect(table)
                .not.toContainEqual(expect.objectContaining({ firstName: 'Piet' }));
            expect(table)
                .not.toContainEqual(expect.objectContaining({ firstName: 'Diana' }));
        });
    });

    describe(mockDb.update, () => {
        it('should not add or delete entries', async () => {
            await mockDb.update(myTable, { firstName: 'Piet' }, { lastName: 'Klaassen' });
            const table = mockDb.getTable(myTable);
            expect(table).toHaveLength(4);
        });

        it('should be able to update a specific entry', async () => {
            await mockDb.update(myTable, { firstName: 'Piet' }, { lastName: 'Klaassen' });
            const table = mockDb.getTable(myTable);

            expect(table).toContainEqual(
                expect.objectContaining({
                    firstName: 'Piet',
                    lastName: 'Klaassen'
                })
            );

            // Only one entry should have been updated
            expect(table.filter(i => i.lastName === 'Klaassen')).toHaveLength(1);
        });

        it('should be able to update more than one entry', async () => {
            await mockDb.update(myTable, { firstName: ['Piet', 'Diana'] }, { lastName: 'Klaassen' });
            const table = mockDb.getTable(myTable);

            expect(table).toContainEqual(
                expect.objectContaining({
                    firstName: 'Piet',
                    lastName: 'Klaassen'
                })
            );
            expect(table).toContainEqual(
                expect.objectContaining({
                    firstName: 'Diana',
                    lastName: 'Klaassen'
                })
            );
        });

        it('should not update more than expected', async () => {
            await mockDb.update(myTable, { firstName: 'Piet' }, { lastName: 'Klaassen' });
            expect(mockDb.getTable(myTable).filter(i => i.lastName === 'Klaassen')).toHaveLength(1);

            await mockDb.update(myTable, { firstName: ['Diana', 'John'] }, { lastName: 'Pietersen' });
            expect(mockDb.getTable(myTable).filter(i => i.lastName === 'Pietersen')).toHaveLength(2);
        });

        it('should ignore `undefined` update fields', async () => {
            await mockDb.update(myTable, { firstName: 'Piet' }, { lastName: 'Klaassen', birthYear: undefined });
            const table = mockDb.getTable(myTable);

            expect(table).toContainEqual(
                expect.objectContaining({
                    firstName: 'Piet',
                    lastName: 'Klaassen',
                    birthYear: 1956,
                })
            );
        });

        it('should set `null` fields to `null`', async () => {
            await mockDb.update(myTable, { firstName: 'Piet' }, { lastName: 'Klaassen', birthYear: null });
            const table = mockDb.getTable(myTable);

            expect(table).toContainEqual(
                expect.objectContaining({
                    firstName: 'Piet',
                    lastName: 'Klaassen',
                    birthYear: null,
                })
            );
        });
    });

    describe(mockDb.select, () => {
        describe('where', () => {
            it('should be able to select all', async () => {
                const out = await mockDb.select(myTable);
                expect(out).toHaveLength(4);
                expect(out).toEqual(mockDb.getTable(myTable));
            });

            it('should be able to use a `where` clause', async () => {
                const out = await mockDb.select(myTable, { where: { firstName: 'Piet' } });
                expect(out).toEqual([{
                    ID: expect.anything(),
                    ...pietData,
                }]);
            });

            it('should ignore `undefined` `where` clauses', async () => {
                const out = await mockDb.select(myTable, { where: { firstName: undefined } });
                expect(out).toHaveLength(4);
            });

            it('should be able to use a `where in` clause implicitly', async () => {
                const out = await mockDb.select(myTable, { where: { firstName: ['Piet', 'Diana'] } });
                expect(out).toHaveLength(2);
                expect(out).toContainEqual(expect.objectContaining({ firstName: 'Piet' }));
                expect(out).toContainEqual(expect.objectContaining({ firstName: 'Diana' }));
            });

            it('should be able to use a `where in` clause explicitly', async () => {
                const out = await mockDb.select(myTable, {
                    where: { firstName: { presence: 'IN', values: ['Piet', 'Diana'] } },
                });
                expect(out).toHaveLength(2);
                expect(out).toContainEqual(expect.objectContaining({ firstName: 'Piet' }));
                expect(out).toContainEqual(expect.objectContaining({ firstName: 'Diana' }));
            });

            it('should be able to use a `where not in` clause', async () => {
                const out = await mockDb.select(myTable, {
                    where: { firstName: { presence: 'NOT IN', values: ['Piet', 'Diana'] } }
                });
                expect(out).toHaveLength(2);
                expect(out).toContainEqual(expect.objectContaining({ firstName: 'John' }));
                expect(out).toContainEqual(expect.objectContaining({ firstName: 'Monique' }));
            });

            describe('comparators', () => {
                test.each`
                comparator  | expected
                ${'='}      | ${[1963]}
                ${'!='}     | ${[1956, 1937, 1965]}
                ${'<'}      | ${[1956, 1937]}
                ${'<='}     | ${[1956, 1937, 1963]}
                ${'>'}      | ${[1965]}
                ${'>='}     | ${[1963, 1965]}
                `(`should be able to use '$comparator'`, async ({ comparator, expected }) => {
                    const out = await mockDb.select<Meteoroloog & { ID: number; }>(myTable, {
                        where: { birthYear: { comparator, value: 1963 } }
                    });
                    expect(out.map(o => o.birthYear)).toEqual(expected);
                });
            });

            it('should be able to use multiple where clauses', async () => {
                await mockDb.insert(myTable, { ...pietData, birthYear: 1990 });
                const out = await mockDb.select(myTable, {
                    where: {
                        birthYear: { comparator: '>', value: 1960 },
                        lastName: 'Paulusma'
                    }
                });
                expect(out).toHaveLength(1);
            });
        });

        describe('joins', () => {
            it('should be able to perform a simple (INNER) join', async () => {
                const data = await mockDb.select(myTable, {
                    columns: ['firstName', 'avg', 'year'],
                    join: { table: 'temperaturen', onEquals: { year: 'birthYear' } }
                });
                expect(data).toEqual([
                    { firstName: 'Piet', avg: 8.1, year: 1956 },
                    { firstName: 'John', avg: 9.5, year: 1937 },
                    { firstName: 'Monique', avg: 7.8, year: 1963 },
                ]);
            });

            it('should duplicate values if applicable', async () => {
                await mockDb.insert('temperaturen', [{ year: 1937, avg: 10 }]);
                const data = await mockDb.select(myTable, {
                    columns: ['firstName', 'avg', 'year'],
                    join: { table: 'temperaturen', onEquals: { year: 'birthYear' } }
                });
                expect(data).toEqual([
                    { firstName: 'Piet', avg: 8.1, year: 1956 },
                    { firstName: 'John', avg: 9.5, year: 1937 },
                    { firstName: 'John', avg: 10, year: 1937 },
                    { firstName: 'Monique', avg: 7.8, year: 1963 },
                ]);
            });

            it('should be able to perform a LEFT join', async () => {
                const data = await mockDb.select(myTable, {
                    columns: ['firstName', 'avg', 'year'],
                    join: { type: 'LEFT', table: 'temperaturen', onEquals: { year: 'birthYear' } }
                });
                expect(data).toEqual([
                    { firstName: 'Piet', avg: 8.1, year: 1956 },
                    { firstName: 'John', avg: 9.5, year: 1937 },
                    { firstName: 'Monique', avg: 7.8, year: 1963 },
                    { firstName: 'Diana', avg: null, year: null },
                ]);
            });

            it('should be able to perform a RIGHT join', async () => {
                const data = await mockDb.select(myTable, {
                    columns: ['firstName', 'avg', 'year'],
                    join: { type: 'RIGHT', table: 'temperaturen', onEquals: { year: 'birthYear' } }
                });
                expect(data).toEqual([
                    { firstName: 'Piet', avg: 8.1, year: 1956 },
                    { firstName: 'John', avg: 9.5, year: 1937 },
                    { firstName: 'Monique', avg: 7.8, year: 1963 },
                    { firstName: null, avg: 9.7, year: 1938 },
                    { firstName: null, avg: 9.6, year: 1939 },
                    { firstName: null, avg: 9.4, year: 1966 },
                ]);
            });

            it('should be able to use a where clause on a joined table', async () => {
                const data = await mockDb.select(myTable, {
                    columns: ['firstName', 'avg', 'year'],
                    join: { table: 'temperaturen', onEquals: { year: 'birthYear' } },
                    where: { avg: { comparator: '<=', value: 8.5 } },
                });

                expect(data).toEqual([
                    { firstName: 'Piet', avg: 8.1, year: 1956 },
                    { firstName: 'Monique', avg: 7.8, year: 1963 },
                ]);
            });

            describe('querying a specific table in the where clause', () => {
                it('should be able to use a string', async () => {
                    const data = await mockDb.select(myTable, {
                        columns: ['firstName', 'avg', 'year'],
                        join: { table: 'temperaturen', onEquals: { year: 'birthYear' } },
                        where: { '"temperaturen"."ID"': mockDb.getTable('temperaturen')[0].ID },
                    });

                    expect(data).toEqual([
                        { firstName: 'John', avg: 9.5, year: 1937 },
                    ]);
                });

                it('should be able to specify the table in an object', async () => {
                    const data = await mockDb.select(myTable, {
                        columns: ['firstName', 'avg', 'year'],
                        join: { table: 'temperaturen', onEquals: { year: 'birthYear' } },
                        where: {
                            ID: {
                                value: mockDb.getTable('temperaturen')[0].ID,
                                table: 'temperaturen'
                            }
                        },
                    });

                    expect(data).toEqual([
                        { firstName: 'John', avg: 9.5, year: 1937 },
                    ]);
                });
            });
        });

        describe('orderBy', () => {
            it('should be able to use a simple `orderBy` clause', async () => {
                const out = await mockDb.select<Meteoroloog & { ID: number; }>(myTable, { orderBy: ['birthYear'] });
                expect(out.map(o => o.birthYear)).toEqual([1937, 1956, 1963, 1965]);
            });

            it('should be able to reverse the `orderBy` clause', async () => {
                const asc = await mockDb.select<Meteoroloog & { ID: number; }>(myTable, { orderBy: [{ column: 'birthYear', direction: 'ASC' }] });
                expect(asc.map(o => o.birthYear)).toEqual([1937, 1956, 1963, 1965]);

                const desc = await mockDb.select<Meteoroloog & { ID: number; }>(myTable, { orderBy: [{ column: 'birthYear', direction: 'DESC' }] });
                expect(desc.map(o => o.birthYear)).toEqual([1965, 1963, 1956, 1937]);
            });

            it('should correctly order numeric strings and `null` as numbers', async () => {
                await mockDb.insert(myTable, { birthYear: '945' });
                await mockDb.insert(myTable, { birthYear: null });

                const desc = await mockDb.select<Meteoroloog & { ID: number; }>(myTable, { orderBy: ['birthYear'] });
                expect(desc.map(o => o.birthYear)).toEqual([null, '945', 1937, 1956, 1963, 1965]);
            });

            it('should be able to sort by multiple columns', async () => {
                await mockDb.insert(myTable, [{ ...pietData, firstName: 'Klaas' }, pietData]);
                const out = await mockDb.select<Meteoroloog & { ID: number; }>(myTable, { orderBy: ['birthYear', 'firstName'] });
                expect(out.map(({ firstName, birthYear }) => ({ firstName, birthYear }))).toEqual([
                    { birthYear: 1937, firstName: 'John' },
                    { birthYear: 1956, firstName: 'Klaas' },
                    { birthYear: 1956, firstName: 'Piet' },
                    { birthYear: 1956, firstName: 'Piet' },
                    { birthYear: 1963, firstName: 'Monique' },
                    { birthYear: 1965, firstName: 'Diana' },
                ]);
            });
        });

        describe('columns', () => {
            it('should be able to filter output columns', async () => {
                const out = await mockDb.select(myTable, { columns: ['ID', 'firstName'] });
                expect(out).toEqual([{
                    ID: expect.anything(),
                    firstName: 'Piet'
                }, {
                    ID: expect.anything(),
                    firstName: 'John'
                }, {
                    ID: expect.anything(),
                    firstName: 'Monique'
                }, {
                    ID: expect.anything(),
                    firstName: 'Diana'
                }]);
            });

            it('should be able to use an alias on the output columns', async () => {
                const out = await mockDb.select(myTable, { columns: ['ID', { name: 'firstName', alias: 'name' }] });
                expect(out).toEqual([{
                    ID: expect.anything(),
                    name: 'Piet'
                }, {
                    ID: expect.anything(),
                    name: 'John'
                }, {
                    ID: expect.anything(),
                    name: 'Monique'
                }, {
                    ID: expect.anything(),
                    name: 'Diana'
                }]);

            });

            it('should be able to select the table of an output column', async () => {
                const data = await mockDb.select(myTable, {
                    columns: [{ name: 'ID', table: 'temperaturen', alias: 'tempId' }, { name: 'ID', table: myTable, alias: 'meteoId' }],
                    join: { table: 'temperaturen', onEquals: { year: 'birthYear' } },
                    limit: 1,
                });
                const meteoId = mockDb.getTable(myTable)[0].ID;
                const [{ ID: tempId }] = await mockDb.select('temperaturen', { where: { year: mockDb.getTable(myTable)[0].birthYear } });
                expect(data).toEqual([{ meteoId, tempId }]);
            });
        });

        it('should be able to use a `limit` clause', async () => {
            const out = await mockDb.select(myTable, { limit: 2 });
            expect(out).toHaveLength(2);
        });

        it('should be able to use all the options together', async () => {
            const out = await mockDb.select(myTable, {
                columns: ['firstName', 'lastName'],
                join: { table: 'temperaturen', onEquals: { year: 'birthYear' } },
                where: { avg: { comparator: '>=', value: 8.1 } },
                orderBy: [{ column: 'birthYear', direction: 'DESC' }],
                limit: 2,
            });
            expect(out).toEqual([
                { firstName: 'Piet', lastName: 'Paulusma' },
                { firstName: 'John', lastName: 'Bernard' },
            ]);
        });
    });

    describe(mockDb.execute, () => {
        it('is not supported', async () => {
            await expect(mockDb.execute()).rejects.toContain('Direct SQL execution is not supported in Test');
        });
    });

    describe(mockDb.procedure, () => {
        it('is not supported', async () => {
            await expect(mockDb.procedure()).rejects.toContain('DB Procedure execution is not supported in Test');
        });
    });
});
