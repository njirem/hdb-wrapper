
export function quote(prop: string) {
    return prop.startsWith('"') && prop.endsWith('"') ? prop : `"${prop}"`;
}

export function replace(columns: ReadonlyArray<unknown> = [], replaceBy: string) {
    return columns.map(() => replaceBy).join();
}
