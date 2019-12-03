import { quote } from './utils';

export function generateColumn(column: Column) {
    if (typeof column === 'string') { return quote(column); }
    const { name, table } = column;
    return table ? `${quote(table)}.${quote(name)}` : quote(name);
}

export function generateSelectColumns(columns?: AliasableColumn[]) {
    if (!columns) { return '*'; }
    return columns.map(col => {
        let out = generateColumn(col);
        if (typeof col === 'object' && col.alias) {
            out += ` as ${quote(col.alias)}`;
        }
        return out;
    }).join(', ');
}

interface ColumnOptions {
    name: string;
    table?: string;
}
export type Column = ColumnOptions | string;
interface AliasableColumnOptions extends ColumnOptions {
    alias?: string;
}
export type AliasableColumn = AliasableColumnOptions | string;
