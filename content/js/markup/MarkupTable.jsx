import {MarkupRenderer} from "markup/MarkupRenderer";
import {UI, Table} from "UI";

export class MarkupTable extends Table {
    setOptions(options) {
        options.columns = (options.columns || []).map((column) => ({
            ...column,
            value: entry => <MarkupRenderer value={entry[column.fieldName] || entry[column.field] || ""} />,
        }))

        super.setOptions(options);
    }

    getEntries() {
        return this.options.rows || this.options.entries;
    }
}
