import {UI} from "../../../../stemjs/ui/UIBase";
import {Table} from "../../../../stemjs/ui/table/Table";
import {MarkupRenderer} from "../../../../stemjs/markup/MarkupRenderer";

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
