import { Column, generateColumn } from './column';

export function generateOrderBy(orderBy?: OrderBy) {
    if (!orderBy) { return ''; }
    return ' ORDER BY ' + orderBy.map(o => {
        if (typeof o === 'string') { return generateColumn(o); }
        const out = generateColumn(o.column);
        return o.direction ? `${out} ${o.direction}` : out;
    }).join(', ');
}

interface OrderByOption {
    column: Column;
    direction?: 'ASC' | 'DESC';
}
export type OrderBy = Array<OrderByOption | string>;
