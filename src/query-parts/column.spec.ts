import { generateColumn, generateSelectColumns } from "./column";

describe(generateColumn, () => {
    it('should be able to use a simple string', () => {
        expect(generateColumn('MY_PROP')).toBe('"MY_PROP"');
    });

    it('should be able to use column options', () => {
        expect(generateColumn({ name: 'MY_PROP' })).toBe('"MY_PROP"');
    });

    it('should be able to add a table', () => {
        expect(generateColumn({ name: 'MY_PROP', table: 'myTable' })).toBe('"myTable"."MY_PROP"');
    });
});

describe(generateSelectColumns, () => {
    it('should return `*` if not given anything', () => {
        const query = generateSelectColumns();
        expect(query).toBe('*');
    });

    it('should be able to generate an array of columns', () => {
        const query = generateSelectColumns(['MY_PROP', 'MY_OTHER_PROP']);
        expect(query).toBe('"MY_PROP", "MY_OTHER_PROP"');
    });
    it('should be able to use column options', () => {
        const query = generateSelectColumns([
            'MY_PROP', 
            { name: 'MY_OTHER_PROP', table: 'myTable' },
            { name: 'MY_THIRD_PROP', alias: 'third' },
            { name: 'MY_FOURTH_PROP', table: 'myTable', alias: 'fourth' },
        ]);
        expect(query).toBe('"MY_PROP", "myTable"."MY_OTHER_PROP", "MY_THIRD_PROP" as "third", "myTable"."MY_FOURTH_PROP" as "fourth"');
    });
});
