import { promisify } from 'util';
import * as queries from './query';
import { SelectOptions } from './query';
import { OrderBy, Where } from './query-parts';
import { MapWithDefault } from './utils';

export class DbWrapper {
    /** @internal */
    private readonly pendingChanges: Array<{ change: string; table: string; }> = [];
    /** @internal */
    private readonly client: import('hdb').Connection;
    constructor(client: import('hdb').Connection) { this.client = client; }

    /** @internal */
    private _timestamp?: string;
    get timestamp() { return this._timestamp || (this._timestamp = new Date().toISOString()); }

    /** @param force - Force a commit, even if there are no pendingChanges (e.g. because of direct use of `Wrapper#execute`) */
    async commit(force?: boolean) {
        this._timestamp = undefined;
        if (!force && !this.pendingChanges.length) { return; }
        await promisify(this.client.commit).call(this.client)
            .catch((e: Error) => {
                throw new Error(`Commit failed!\n${e}\nPending changes:\n${this.pendingChanges.map(p => `${p.change.toUpperCase()}-${p.table}`).join('\n')}`);
            });
        this.pendingChanges.length = 0;
    }

    /** @param force - Force a rollback, even if there are no pendingChanges registered (e.g. because of direct use of `Wrapper#execute`) */
    async rollback(force?: boolean) {
        this._timestamp = undefined;
        if (!force && !this.pendingChanges.length) { return; }
        await promisify(this.client.rollback).call(this.client)
            .catch((e: Error) => {
                throw new Error(`Rollback failed!\n${e}\nPending changes:\n${this.pendingChanges.map(p => `${p.change.toUpperCase()}-${p.table}`).join('\n')}`);
            });
        this.pendingChanges.length = 0;
    }

    async select<T extends {} = DbWrapper.BaseEntity>(tableName: string, options: SelectOptions = {}) {
        const { query, values } = queries.select(tableName, options);

        return this.execute<T[]>(query, values)
            .then(r => r || [])
            .catch((e: Error) => {
                throw new Error(`Unexpected error Selecting from '${tableName}'\n${e}`);
            });
    }

    /**
     * @param tableName - The Table to insert into
     * @param data - The data to insert into the table Can be one or multiple objects, multiple objects will be added as a Batch.
     *               The objects need to all have the same keys!!
     * @param uniqueProps - If given, will query the newly created rows by this unique prop
     */
    async insert<T extends import('hdb').Data, PK = DbWrapper.BaseEntity>(tableName: string, datas: T | T[], ...uniqueProps: Array<keyof T & string>) {
        if (!Array.isArray(datas)) { datas = [datas]; }
        if (!datas.length) { return []; }

        const { query, values } = queries.insert(tableName, datas);

        await this.execute(query, values)
            .catch((e: Error) => {
                throw new Error(`Unexpected error Inserting into '${tableName}'\n${e}`);
            });
        this.pendingChanges.push({ change: 'insert', table: tableName });

        if (!uniqueProps.length) { return []; }

        const orderBy: OrderBy = [{ column: await this.primaryKeyCache.get(tableName), direction: 'DESC' }];
        const where: Where = {};
        for (const prop of uniqueProps) { where[prop] = datas.map(data => data[prop]).filter(p => p !== undefined); }
        const out = await this.select(tableName, { where, orderBy, limit: datas.length }) as Array<T & PK>;
        // Reverse the array, to make sure the elements are in insertion order
        return out.reverse();
    }

    /**
     * @param tableName - The table to update the record in
     * @param where - Object defining the record to update
     * @param data - Object defining the values to update, non existant/`undefined` properties will be ignored
     * @returns - The number of records affected
     */
    async update(tableName: string, where: Where, data: import('hdb').Data) {
        const { query, values } = queries.update(tableName, where, data);
        // Nothing to update!
        if (!query) { return; }

        const affected = await this.execute(query, values)
            .catch(e => {
                throw new Error(`Unexpected error Updating in '${tableName}'\n${e}`);
            }) as number;
        this.pendingChanges.push({ change: 'update', table: tableName });
        return affected;
    }

    /**
     * @param tableName - The table to delete from
     * @param where - Object defining the record to delete
     */
    async delete(tableName: string, where: Where) {
        const { query, values } = queries.deleteFn(tableName, where);

        await this.execute(query, values)
            .catch(e => {
                throw new Error(`Unexpected error Deleting from '${tableName}'\n${e}`);
            });
        this.pendingChanges.push({ change: 'delete', table: tableName });
    }

    async execute<T = unknown>(sql: string, params?: Array<import('hdb').Primitive> | Array<Array<import('hdb').Primitive>>) {
        try {
            if (Array.isArray(params) && params.length) {
                const stmt = await this.prepare(sql);
                try {
                    return await promisify(stmt.exec).call(stmt, params) as T;
                } finally {
                    stmt.drop(() => { /** nothing to do here */ });
                }
            }
            return await promisify(this.client.exec).call(this.client, sql) as T;
        } catch (e) {
            throw new Error(`Error while executing:\n${sql}\n${e}`);
        }
    }

    /** @internal */
    private async prepare(sql: string) {
        const stmt = await promisify(this.client.prepare).call(this.client, sql);
        return stmt;
    }

    /** @internal */
    private readonly primaryKeyCache = new MapWithDefault(async (tableName: string) => {
        tableName = escapeSingleQuotes(tableName);
        const sql = `SELECT "COLUMN_NAME" FROM "SYS"."TABLE_COLUMNS" WHERE "TABLE_NAME" = '${tableName}' AND "IS_NULLABLE" = 'FALSE' AND "INDEX_TYPE" = 'FULL'`;
        const [{ COLUMN_NAME }] = await this.execute(sql) as Array<{ COLUMN_NAME: string }>;
        return COLUMN_NAME;
    });
}

/**
 * Returns the string parameter with all single quotation marks escaped (i.e. doubled)
 * @param value The string to escape
 */
function escapeSingleQuotes(value: string) {
    return value.replace(/'/g, `''`);
}

declare global {
    namespace DbWrapper {
        /** Extendable interface to indicate the properties that every database entity should have (will probably be something like { id: number }); */
        export interface BaseEntity { }
    }
}
