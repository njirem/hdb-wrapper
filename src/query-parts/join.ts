'use strict';
import { Column, generateColumn } from './column';
import { quote } from './utils';

export function generateJoins(joins?: Join | Join[]) {
    if (!joins) { return ''; }
    if (!Array.isArray(joins)) { joins = [joins]; }
    return joins.map(({ onEquals, type, table }) => {
        const conditions = Object.entries(onEquals).map(([name, otherCol]) => `${generateColumn({ name, table })} = ${generateColumn(otherCol)}`).join(' AND ');
        return ` ${type || 'INNER'} JOIN ${quote(table)} ON ${conditions}`;
    }).join('');
}

export interface OnEquals {
    [joinedTableColumn: string]: Column;
}
export type SupportedJoins = 'INNER' | 'LEFT' | 'RIGHT';
export interface Join {
    type?: SupportedJoins;
    table: string;
    onEquals: OnEquals;
}
