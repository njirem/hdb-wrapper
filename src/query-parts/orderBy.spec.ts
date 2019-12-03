import { generateOrderBy } from "./orderBy";

describe(generateOrderBy, () => {
    it('should return an empty string if there is no input', () => {
        expect(generateOrderBy()).toBeFalsy();
    });

    it('should generate a valid orderBy on a column', () => {
        expect(generateOrderBy(['DATE'])).toBe(' ORDER BY "DATE"');
    });

    it('should generate a valid orderBy on multiple columns', () => {
        expect(generateOrderBy(['DATE', 'NAME'])).toBe(' ORDER BY "DATE", "NAME"');
    });

    it('should be able to change the direction', () => {
        expect(generateOrderBy([
            { column: 'DATE', direction: 'ASC' }, 
            { column: 'NAME', direction: 'DESC' }, 
            'OTHER'
        ])).toBe(' ORDER BY "DATE" ASC, "NAME" DESC, "OTHER"');
    });

    it('should be able to specify a table', () => {
        expect(generateOrderBy([
            { column: { name: 'CHANGED_ON', table: 'myTable' } }
        ])).toBe(' ORDER BY "myTable"."CHANGED_ON"')
    });
});
