import { quote, replace } from "./utils";

describe(quote, () => {
    it('should quote unquoted properties', () => {
        expect(quote('PROP')).toBe('"PROP"');
    });

    it('should not quote quoted properties', () => {
        expect(quote('"PROP"')).toBe('"PROP"');
    })
});

describe(replace, () => {
    it('should create a string based on an array, where every item in the given array is replaced with the given string', () => {
        expect(replace(['foo', 'bar'], 'baz')).toBe('baz,baz');
    });

    it('should default to an empty array if nothing is given', () => {
        expect(replace(undefined, '?')).toBe('');
    });
});
