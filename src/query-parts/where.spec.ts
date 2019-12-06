import { generateWhere } from './where';

describe(generateWhere, () => {
    it('should return nothing if there is no input', () => {
        const { query, values } = generateWhere();
        expect(query).toBeFalsy();
        expect(values).toHaveLength(0);
    });

    it('should be able to match primitives', () => {
        const { query, values } = generateWhere({ STR: 'value', NUM: 2, BOOL: false });
        expect(query).toBe(` WHERE "STR" = ? AND "NUM" = ? AND "BOOL" = ?`);
        expect(values).toEqual(['value', 2, false]);
    });

    it('should be able to match multiple primitives', () => {
        const { query, values } = generateWhere({ ARR: ['value', 'otherValue'] });
        expect(query).toBe(` WHERE "ARR" IN (?,?)`);
        expect(values).toEqual(['value', 'otherValue']);
    });

    it('should be able to match arrays with and without a custom comparator', () => {
        const { query, values } = generateWhere({
            ARR: { values: ['value', 'otherValue'] },
            NARR: { values: ['value', 'otherValue'], presence: 'NOT IN' },
        });
        expect(query).toBe(` WHERE "ARR" IN (?,?) AND "NARR" NOT IN (?,?)`);
        expect(values).toEqual(['value', 'otherValue', 'value', 'otherValue']);
    });

    it('should be able to handle empty arrays', () => {
        const arr = generateWhere({ ARR: [] });
        expect(arr.query).toBe(` WHERE true = false`);
        expect(arr.values).toHaveLength(0);

        const narr = generateWhere({ NARR: { values: [], presence: 'NOT IN' } });
        expect(narr.query).toBe(``);
        expect(narr.values).toHaveLength(0);
    });

    it('should be able to match primitives with and without a custom comparator', () => {
        const { query, values } = generateWhere({
            STR: { value: 'value', comparator: '!=' },
            NUM: { value: 2 },
        });
        expect(query).toBe(` WHERE "STR" != ? AND "NUM" = ?`);
        expect(values).toEqual(['value', 2]);
    });

    it('should be able to use complex column keys', () => {
        const single = generateWhere({
            '"SOME_TABLE"."ID"': 3,
            "ID": {
                table: 'OTHER_TABLE',
                value: 4,
            }
        });
        expect(single.query).toBe(` WHERE "SOME_TABLE"."ID" = ? AND "OTHER_TABLE"."ID" = ?`);
        expect(single.values).toEqual([3, 4]);

        const multiple = generateWhere({
            '"SOME_TABLE"."ID"': [3, 4, 5],
            "ID": {
                table: 'OTHER_TABLE',
                values: [6, 7, 8],
            }
        });
        expect(multiple.query).toBe(` WHERE "SOME_TABLE"."ID" IN (?,?,?) AND "OTHER_TABLE"."ID" IN (?,?,?)`);
        expect(multiple.values).toEqual([3, 4, 5, 6, 7, 8]);
    });

    it('should treat `null` differently', () => {
        const { query, values } = generateWhere({
            prop: null,
            other_prop: { comparator: '!=', value: null },
        });
        expect(query).toBe(` WHERE "prop" IS NULL AND "other_prop" IS NOT NULL`);
        expect(values).toEqual([]);

        expect(() => generateWhere({
            prop: { comparator: '>', value: null }
        })).toThrow(`Cannot compare to NULL with '>'`);
    });
});
