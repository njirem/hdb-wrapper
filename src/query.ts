import {
    AliasableColumn, generateJoins, generateOrderBy, generateSelectColumns, generateWhere, Join, OrderBy, quote, replace, Where,
} from './query-parts';

export function select(tableName: string, options: SelectOptions) {
    const { query: whereQuery, values } = generateWhere(options.where);

    const query = `SELECT ${generateSelectColumns(options.columns)} FROM ${quote(tableName)}`
        + generateJoins(options.join)
        + whereQuery
        + generateOrderBy(options.orderBy)
        + (options.limit ? ` LIMIT ${options.limit}` : '');

    return { query, values };
}

export function insert<T extends import('hdb').Data>(tableName: string, datas: T[]) {
    const columns = Array.from(datas.reduce((set, data) => {
        Object.keys(data).forEach(key => set.add(key));
        return set;
    }, new Set<keyof T & string>()).values());
    const values = datas.map(data => columns.map(k => data[k]));
    return {
        query: `INSERT INTO ${quote(tableName)} (${columns.map(quote).join()}) VALUES (${replace(columns, '?')})`,
        values,
    };
}

export function update(tableName: string, where: Where, data: import('hdb').Data) {
    const entries = Object.entries(data).filter(([_, value]) => value !== undefined);
    if (!entries.length) { return {}; }
    const dataKeys = entries.map(([key]) => `${quote(key)} = ?`);
    const dataValues = entries.map(([_, value]) => value);

    const { query: whereQuery, values: whereValues } = generateWhere(where);
    if (!whereQuery) { throw new Error(`Cannot UPDATE on '${tableName}' without a valid where clause`); }
    return {
        query: `UPDATE ${quote(tableName)} SET ${dataKeys.join()}${whereQuery}`,
        values: [...dataValues, ...whereValues],
    };
}

export function deleteFn(tableName: string, where: Where) {
    const { query: whereQuery, values } = generateWhere(where);
    if (!whereQuery) { throw new Error(`Cannot DELETE on '${tableName}' without a valid where clause`); }
    return {
        query: `DELETE FROM ${quote(tableName)}${whereQuery}`,
        values,
    };
}

export interface SelectOptions {
    columns?: AliasableColumn[];
    where?: Where;
    join?: Join | Join[];
    orderBy?: OrderBy;
    limit?: number;
}
