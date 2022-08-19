import {MarkupRenderer} from "markup/MarkupRenderer";
import {UI, Table} from "UI";

export class MarkupTable extends Table {
    getDefaultColumns(options) {
        const columns = options.columns || this.options.columns || [];

        return columns.map((column) => ({
            ...column,
            value: entry => <MarkupRenderer value={entry[column.fieldName] || entry[column.field] || ""} />,
        }));
    }

    getEntries() {
        return this.options.rows || this.options.entries;
    }
}
