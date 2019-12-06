import { Column, generateColumn } from './column';
import { replace } from './utils';

const EMPTY = { query: '', values: [] };

export function generateWhere(where?: Where) {
    if (!where) { return EMPTY; }
    const context: Context = {
        parts: [],
        values: [],
    };
    for (const [key, value] of Object.entries(where)) {
        if (value === undefined) { continue; }
        if (Array.isArray(value)) {
            addWhereArrayPart(context, key, { values: value });
        } else if (typeof value === 'object' && value !== null) {
            if ('values' in value) {
                addWhereArrayPart(context, key, value);
            } else {
                addWhereIsPart(context, key, value);
            }
        } else {
            addWhereIsPart(context, key, { value });
        }
    }
    if (!context.parts.length) { return EMPTY; }

    return { query: ' WHERE ' + context.parts.join(' AND '), values: context.values };
}

function addWhereArrayPart(context: Context, name: string, { values, presence = 'IN', table }: WhereArrayOption) {
    if (values.length === 0) {
        // If there is a `WHERE IN ()` clause with no values, there shouldn't be any results
        if (presence === 'IN') { context.parts.push('true = false'); }
        // If there is a `WHERE NOT IN ()` clause with no values, it won't filter anything and can be skipped
        return;
    }
    context.parts.push(`${generateColumn({ name, table })} ${presence} (${replace(values, '?')})`);
    context.values.push(...values);
}

function addWhereIsPart(context: Context, name: string, { value, comparator = '=', table }: WhereValueOption) {
    if (value === null) { return addNullPart(context, name, comparator); }
    context.parts.push(`${generateColumn({ name, table })} ${comparator} ?`);
    context.values.push(value);
    return;
}

function addNullPart(context: Context, key: Column, comparator: ValueComparator) {
    switch (comparator) {
        case '=': return context.parts.push(`${generateColumn(key)} IS NULL`);
        case '!=':
        case '<>':
            return context.parts.push(`${generateColumn(key)} IS NOT NULL`);
        default:
            throw new Error(`Cannot compare to NULL with '${comparator}'`);
    }
}

interface Context {
    parts: string[];
    values: Array<import('hdb').Primitive>;
}
export type ValueComparator = '=' | '!=' | '<>' | '<' | '>' | '>=' | '<=';
interface WhereValueOption {
    value: import('hdb').Primitive;
    comparator?: ValueComparator;
    table?: string;
}
type WhereValue = WhereValueOption | import('hdb').Primitive;
interface WhereArrayOption {
    values: Array<import('hdb').Primitive>;
    presence?: 'IN' | 'NOT IN';
    table?: string;
}
type WhereArray = WhereArrayOption | Array<import('hdb').Primitive>;
export interface Where {
    [column: string]: WhereValue | WhereArray | undefined;
}
