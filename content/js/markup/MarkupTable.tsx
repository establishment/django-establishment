import {UI, type ExtendedOptions} from "../../../../stemjs/ui/UIBase";
import {Table} from "../../../../stemjs/ui/table/Table";
import {type ColumnOptions} from "../../../../stemjs/base/ColumnHandler";
import {MarkupRenderer} from "../../../../stemjs/markup/MarkupRenderer";

// A row as the markup spells it: one markup snippet per column, keyed by the column's field name
type MarkupTableRow = Record<string, string>;

// A markup column names the row field it renders, in either spelling the markup allows
interface MarkupTableColumn extends ColumnOptions<MarkupTableRow> {
    fieldName?: string;
    field?: string;
}

export interface MarkupTableOptions {
    // What the table renders, in place of the entries a plain Table takes
    rows?: MarkupTableRow[];
}

export class MarkupTable extends Table<MarkupTableRow> {
    declare options: ExtendedOptions<Table<MarkupTableRow>, MarkupTableOptions>;

    setOptions(options: typeof this.options) {
        // Markup spells a column as an object, never as the tuple or the handler a Table also takes
        options.columns = (options.columns || []).map((column: MarkupTableColumn) => ({
            ...column,
            value: (entry: MarkupTableRow) => <MarkupRenderer value={entry[column.fieldName] || entry[column.field] || ""} />,
        }))

        super.setOptions(options);
    }

    getEntries() {
        return this.options.rows || this.options.entries;
    }
}
