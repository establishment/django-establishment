import {UI} from "../../../../stemjs/ui/UIBase.js";
import {Table} from "../../../../stemjs/ui/table/Table.jsx";
import {MarkupRenderer} from "../../../../stemjs/markup/MarkupRenderer.js";

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
