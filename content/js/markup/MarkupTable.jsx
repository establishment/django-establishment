import {UI} from "../../../../stemjs/src/ui/UIBase.js";
import {Table} from "../../../../stemjs/src/ui/table/Table.jsx";
import {MarkupRenderer} from "../../../../stemjs/src/markup/MarkupRenderer.js";

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
