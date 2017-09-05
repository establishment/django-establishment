import {UI, Table} from "UI";
import {MarkupRenderer} from "markup/MarkupRenderer";

export class MarkupTable extends Table {
    setColumns() {
        super.setColumns((this.options.columns || []).map((column) => ({
            headerName: column.headerName || column.header,
            value: entry => <MarkupRenderer value={entry[column.fieldName] || entry[column.field] || ""} />,
            headerStyle: column.headerStyle || {},
            cellStyle: column.cellStyle || {}
        })));
    }

    getEntries() {
        return this.options.rows || this.options.entries;
    }
}
