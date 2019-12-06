import { DateTime } from 'luxon';
import { SelectOptions } from '../query';
import { AliasableColumn, Column, OnEquals, OrderBy, SupportedJoins, ValueComparator, Where } from '../query-parts';
import { DbWrapper } from '../wrapper';

type Public<T> = Pick<T, keyof T>;

class MockDbWrapper implements Public<DbWrapper> {
    private id = 10000000;
    private readonly tables = new Map<string, Array<import('hdb').Data>>();

    /** For testing, reset all tables */
    reset() {
        this.id = 10000000;
        this.tables.clear();
    }
    /** For testing, return the full table */
    getTable<T extends import('hdb').Data>(tableName: string) {
        if (!this.tables.has(tableName)) {
            this.tables.set(tableName, []);
        }
        return this.tables.get(tableName)! as T[];
    }

    private getTableInternal<T extends import('hdb').Data>(tableName: string): InternalDataRow[] {
        return this.getTable<T>(tableName).map(data => [{ tableName, data }]);
    }

    _timestamp?: string;
    get timestamp() {
        return this._timestamp || (this._timestamp = DateTime.utc().toISO());
    }

    readonly select = jest.fn(async <T extends import('hdb').Data = { ID: string | number }>
        (tableName: string, { where, orderBy, limit, columns, join }: SelectOptions = {}) => {
        let selected = this.getTableInternal(tableName);
        if (join) {
            join = Array.isArray(join) ? join : [join];
            join.forEach(({ onEquals, table, type = 'INNER' }) => {
                selected = joinTables(selected, table, this.getTable(table), onEquals, type);
            });
        }
        if (where) { selected = selected.filter(whereFilter(where)); }
        if (orderBy) { selected.sort(sortBy(orderBy)); }

        let out = selected.map(columnsMapper(columns));
        if (limit) { out = out.slice(0, limit); }
        return out as T[];
    }) as jest.Mock & DbWrapper['select'];

    readonly insert = jest.fn(async <T extends import('hdb').Data, PK = { ID: string | number }>(tableName: string, data: T | T[]) => {
        if (!Array.isArray(data)) { data = [data]; }
        const dataToInsert = data.map(d => ({ ...d, ID: this.id++ }));
        this.getTable<T>(tableName).push(...dataToInsert);
        return dataToInsert as unknown as Array<T & PK>;
    });

    readonly delete = jest.fn(async (tableName: string, where: Where) => {
        const filteredTable = this.getTable(tableName).filter(whereFilter(where, { invert: true, assert: true }));
        this.tables.set(tableName, filteredTable);
    });

    readonly update = jest.fn(async (tableName: string, where: Where, data: import('hdb').Data) => {
        const toUpdate = this.getTable(tableName).filter(whereFilter(where, { assert: true }));
        const dataEntries = Object.entries(data).filter(([_, value]) => value !== undefined);
        for (const item of toUpdate) {
            for (const [key, value] of dataEntries) {
                item[key] = value!;
            }
        }
        return toUpdate.length;
    });

    readonly commit = jest.fn(() => Promise.resolve());
    readonly rollback = jest.fn(() => Promise.resolve());
    readonly execute = jest.fn<Promise<any>, any[]>(() => Promise.reject('Direct SQL execution is not supported in Test, since this is a stub, you may want to use `returnValueOnce`'));
    readonly procedure = jest.fn<Promise<any>, any[]>(() => Promise.reject('DB Procedure execution is not supported in Test, since this is a stub, you may want to use `returnValueOnce`'));
}

export const mockDb = new MockDbWrapper;
// Reset the mock database before every test
beforeEach(() => mockDb.reset());

interface InternalDataRowForTable {
    data: import('hdb').Data;
    tableName: string;
}
type InternalDataRow = InternalDataRowForTable[];

function joinTables(datas: InternalDataRow[], tableName: string, newDatas: Array<import('hdb').Data>, onEqual: OnEquals, type: SupportedJoins): InternalDataRow[] {
    const entries = Object.entries(onEqual);
    function findComparableRow(oldDataRow: InternalDataRow, newDataRow: import('hdb').Data) {
        return entries.every(([newDataKey, dataCol]) => newDataRow[newDataKey] == getColumn(oldDataRow, dataCol));
    }

    const expandedData = datas.map(dataRow => {
        const addedInfo = newDatas.filter(newData => findComparableRow(dataRow, newData));
        if (type === 'LEFT' && !addedInfo.length) { return [dataRow]; }
        return addedInfo.map(added => [...dataRow, { tableName, data: added }]);
    });
    if (type === 'RIGHT') {
        expandedData.push(
            ...newDatas.filter(newRow => {
                return !datas.find(dataRow => findComparableRow(dataRow, newRow));
            }).map(data => ([[{ tableName, data }]]))
        );
    }
    return ([] as InternalDataRow[]).concat(...expandedData);
}

const columnRE = /^\"([^"]*)\"\.\"?([^"]*)\"?$/;
function getColumn(datas: InternalDataRow, column: Column) {
    if (typeof column === 'string') {
        const out = columnRE.exec(column);
        if (out) {
            const [, table, name] = out;
            column = { name, table };
        } else {
            column = { name: column };
        }
    }
    const { name, table } = column;
    let t: InternalDataRowForTable | undefined;
    if (column.table) {
        t = datas.find(({ tableName }) => tableName === table);
    } else {
        t = datas.find(({ data }) => name in data);
    }
    const value = t && t.data[name];
    return value === undefined ? null : value;
}

function columnsMapper(columns?: AliasableColumn[]) {
    return (row: InternalDataRow) => {
        const out = {} as import('hdb').Data;
        if (columns) {
            for (const col of columns) {
                const key = typeof col === 'object' ? col.alias ? col.alias : col.name : col;
                if (out[key]) { throw new Error(`Duplicate alias '${key}' in query!`); }
                out[key] = getColumn(row, col);
            }
        } else {
            row.forEach(table => Object.assign(out, table.data));
        }
        return out;
    };
}
function sortBy(orderBy: OrderBy) {
    const expandedOrderBy = orderBy.map(by => {
        if (typeof by === 'string') { return { column: by, factor: 1 }; }
        return { column: by.column, factor: by.direction === 'DESC' ? -1 : 1 };
    });
    return (a: InternalDataRow, b: InternalDataRow) => {
        for (const { column, factor } of expandedOrderBy) {
            const aVal = prepareCompare(getColumn(a, column));
            const bVal = prepareCompare(getColumn(b, column));
            if (aVal < bVal) { return -factor; }
            if (aVal > bVal) { return factor; }
        }
        return 0;
    };
}
function prepareCompare(value: import('hdb').Primitive | undefined) {
    if (typeof value === 'string' && /^[0-9]+$/.test(value)) { return parseInt(value, 10); }
    return value == null ? -Infinity : value;
}

function whereFilter(where: Where, { invert = false, assert = false }: { invert?: boolean; assert?: boolean; } = {}) {
    const whereEntries = Object.entries(where).filter(([, value]) => value !== undefined);
    if (assert && !whereEntries.length) { throw new Error('Need a valid where clause!'); }
    return (item: InternalDataRow | import('hdb').Data) => {
        const selected = whereEntries
            .every(([key, whereValue]) => {
                const column = whereValue && typeof whereValue === 'object' && 'table' in whereValue ? { name: key, table: whereValue.table } : key;
                const itemValue = Array.isArray(item) ? getColumn(item, column) : item[key];
                if (Array.isArray(whereValue)) { return valuesComparator(itemValue, whereValue); }
                if (typeof whereValue !== 'object' || whereValue == null) { return itemValue == whereValue; }
                if ('value' in whereValue) {
                    return valueComparator(itemValue, whereValue.value, whereValue.comparator);
                }
                return valuesComparator(itemValue, whereValue.values, whereValue.presence);
            });
        return invert ? !selected : selected;
    };
}

function valueComparator(a: import('hdb').Primitive, b: import('hdb').Primitive, comparator: ValueComparator = '=') {
    a = prepareCompare(a);
    b = prepareCompare(b);
    switch (comparator) {
        // tslint:disable-next-line: triple-equals
        case '=': return a == b;
        case '<>':
        // tslint:disable-next-line: triple-equals
        case '!=': return a != b;
        case '<': return a < b;
        case '<=': return a <= b;
        case '>': return a > b;
        case '>=': return a >= b;
    }
}
function valuesComparator(a: any, arrB: any[], presence: 'IN' | 'NOT IN' = 'IN') {
    // tslint:disable-next-line: triple-equals
    const has = arrB.some(val => a == val);
    return presence === 'IN' ? has : !has;
}
