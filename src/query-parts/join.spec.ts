import { generateJoins } from "./join";

describe(generateJoins, () => {
    it('should return an empty string if there is no input', () => {
        expect(generateJoins()).toBeFalsy();
    });

    it('should be able to join two tables by ID', () => {
        expect(generateJoins({
            table: 'secondTable',
            onEquals: { ID: 'SECOND_ID' },
        })).toBe(' INNER JOIN "secondTable" ON "secondTable"."ID" = "SECOND_ID"');
    });

    it('should be able to specify type', () => {
        expect(generateJoins({
            table: 'secondTable',
            onEquals: { ID: 'SECOND_ID' },
            type: 'LEFT'
        })).toBe(' LEFT JOIN "secondTable" ON "secondTable"."ID" = "SECOND_ID"');
    });

    it('should be able to join by multiple properties', () => {
        expect(generateJoins({
            table: 'secondTable',
            onEquals: {
                ID: 'SECOND_ID',
                SOME_PROP: 'COMPARABLE_PROP'
            },
        })).toBe(' INNER JOIN "secondTable" ON "secondTable"."ID" = "SECOND_ID" AND "secondTable"."SOME_PROP" = "COMPARABLE_PROP"');
    });

    it('should be able to use specific tables in the on query', () => {
        expect(generateJoins({
            table: 'secondTable',
            onEquals: { OBJECT_ID: { table: 'mainTable', name: 'ID' } },
        })).toBe(' INNER JOIN "secondTable" ON "secondTable"."OBJECT_ID" = "mainTable"."ID"');
    });

    it('should be able to join multiple tables', () => {
        expect(generateJoins([{
            table: 'secondTable',
            onEquals: { ID: 'SECOND_ID' },
        }, {
            table: 'thirdTable',
            onEquals: { ID: 'THIRD_ID' },
        }])).toBe(' INNER JOIN "secondTable" ON "secondTable"."ID" = "SECOND_ID" INNER JOIN "thirdTable" ON "thirdTable"."ID" = "THIRD_ID"');
    });
});
