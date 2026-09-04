// TODO: this whole file needs a refactoring
import {UI, type ExtendedOptions, type ElementOptions, type UIElement, type TextUIElement} from "../../../stemjs/ui/UIBase";
import {TabArea} from "../../../stemjs/ui/tabs/TabArea";
import {Table, TableRow} from "../../../stemjs/ui/table/Table";
import {Button} from "../../../stemjs/ui/button/Button";
import {TextInput} from "../../../stemjs/ui/input/Input";
import {FileInput} from "../../../stemjs/ui/input/Input";
import {RawCheckboxInput} from "../../../stemjs/ui/input/Input";
import {TextArea} from "../../../stemjs/ui/input/Input";
import {Level} from "../../../stemjs/ui/Constants";
import {Select} from "../../../stemjs/ui/input/Input";
import {FileSaver} from "../../../stemjs/base/FileSaver";
import {Ajax} from "../../../stemjs/base/Ajax";
import {NOOP_FUNCTION} from "../../../stemjs/base/Utils";

import {TranslationKey, TranslationEntry} from "./state/TranslationStore";
import {Language} from "./state/LanguageStore";
import {type StoreId} from "../../../stemjs/state/State";

function ajaxCall(request: object, onSuccess=NOOP_FUNCTION, onError=NOOP_FUNCTION) {
    Ajax.postJSON("/edit_translation/", request).then(onSuccess, onError);
}

export interface TranslationEntryTableRowOptions {
    entryInput?: TextInput;
    saveButton?: Button;
}

class TranslationEntryTableRow extends TableRow {
    declare options: ExtendedOptions<TableRow, TranslationEntryTableRowOptions>;
    declare entryInput: TextInput;
    declare saveButton: Button;
    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.options.saveButton = this.saveButton;
    }

    onMount() {
        super.onMount();

        this.saveButton.addClickListener(() => {
            this.saveKey();
        });

        this.entryInput.addChangeListener(() => {
            this.markChanged();
        });
    }

    redraw() {
        super.redraw();
        this.options.entryInput = this.entryInput;
    }

    markChanged() {
        this.setStyle("background-color", "lightblue");
    }

    markUnchanged() {
        this.setStyle("background-color", "white");
    }

    saveKey() {
        let entry = this.options.entry;
        let editEntries = [{
                    keyId: entry.key.id,
                    languageId: entry.language.id,
                    newValue: this.entryInput.getValue()
                }];
        let request = {
            editEntries: JSON.stringify(editEntries)
        };
        ajaxCall(request, () => {
            this.markUnchanged();
        });
    }

    getEntryInput() {
        return this.options.entryInput;
    }
}

export interface TranslationEntryTableOptions {
    language?: Language;
}

type TranslationEntryRow = ReturnType<TranslationEntryTable["getEntries"]>[number];

class TranslationEntryTable extends Table {
    declare options: ExtendedOptions<Table, TranslationEntryTableOptions>;

    getRowClass() {
        return TranslationEntryTableRow;
    }

    getDefaultColumns() {
        const numberStyle = {
            textAlign: "right"
        };

        return [{
            value: (entry: TranslationEntryRow) => entry.key.id,
            headerName: "Key ID",
            sortDescending: true,
            cellStyle: numberStyle,
            headerStyle: numberStyle,
        }, {
            value: (entry: TranslationEntryRow) => entry.key.value,
            headerName: "Entry value",
            sortDescending: true,
            cellStyle: numberStyle,
            headerStyle: numberStyle,
        }, {
            value: (entry: TranslationEntryRow) => {
                return <div className="form-group">
                    <TextInput ref="entryInput" value={entry.entry ? entry.entry.value : ""}/>
                </div>;
            },
            headerName: "Key value",
            sortDescending: true,
            cellStyle: numberStyle,
            headerStyle: numberStyle,
        }, {
            value: (entry: TranslationEntryRow) => {
                return <div className="form-group">
                    <Button ref="saveButton" label="Save" level={Level.INFO}/>
                </div>;
            },
            headerName: "Actions",
            sortDescending: true,
        }];
    }

    // TODO @cleanup shouldn't we just delete all these?
    getEntryKey(entry: TranslationEntryRow, index: number) {
        return index;
    }

    getEntries() {
        const {language} = this.options;

        let keyEntryMap = new Map();
        for (let entry of TranslationEntry.all()) {
            if (entry.getLanguage().id === language.id) {
                keyEntryMap.set(entry.getTranslationKey().id, entry);
            }
        }

        const result = TranslationKey.all().map((key) => ({
            key,
            entry: keyEntryMap.get(key.id),
            language,
        }));
        return result;
    }
}

export interface TranslationEntryManagerOptions {
}

class TranslationEntryManager extends UI.Element {
    declare options: ElementOptions<TranslationEntryManagerOptions>;

    declare exportButton: Button;
    declare importButton: Button;
    declare language: Language;
    declare languageSelect: Select<ReturnType<TranslationEntryManager["getLanguageOptions"]>[number]>;
    declare saveAllButton: Button;
    declare translationTable: TranslationEntryTable;
    declare uploadFile: FileInput;

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.language = Language.get(1);
    }

    render() {
        let languageOptions = this.getLanguageOptions();
        return [
            <div className="form-group">
                <Select className="form-control" options={languageOptions} ref="languageSelect" />
                <TranslationEntryTable ref="translationTable" language={this.language} />
            </div>,
            <div className="btn-group">
                <Button ref="saveAllButton" label="Save all" level={Level.INFO} />
                <Button className="pull-left" level={Level.INFO} label="Import" ref="importButton"
                           style={{position: "relative", overflow: "hidden"}}>
                    <FileInput ref="uploadFile" style={{position: "absolute", top: "0", right: "0", margin: "0",
                                                           padding: "0", cursor: "pointer", opacity: "0", filter: "alpha(opacity=0)"}}/>
                </Button>
                <Button ref="exportButton" label="Export" level={Level.INFO} />
            </div>
        ];
    }

    getLanguageOptions() {
        return Language.all().map((language) => ({
            value: language,
            toString: () => language.name
        }));
    }

    onMount() {
        super.onMount();

        this.languageSelect.addChangeListener(() => {
            this.changeLanguage();
        });
        this.saveAllButton.addClickListener(() => {
            this.saveAll();
        });
        this.importButton.addClickListener(() => {
            this.importFromFile();
        });
        this.exportButton.addClickListener(() => {
            this.exportToFile();
        });
    }

    changeLanguage() {
        this.language = this.languageSelect.get().value;
        this.redraw();
    }

    saveAll() {
        let changes = [];
        for (let row of this.translationTable.rows) {
            let entryNewValue = row.options.entryInput.getValue();
            let keyId = row.options.entry.key.id;
            let entry = row.options.entry.entry;
            let change: {keyId?: StoreId; newValue?: string; languageId?: StoreId; entryId?: StoreId} = {};
            if (entryNewValue === "" && !entry) {
                continue;
            }
            if (entry && entryNewValue === entry.value) {
                continue;
            }
            change = {
                keyId: keyId,
                newValue: entryNewValue,
                languageId: this.language.id
            };
            if (entry) {
                change.entryId = entry.id;
            }
            changes.push(change);
        }
        let request = {
            editEntries: JSON.stringify(changes)
        };
        ajaxCall(request, () => {
            // TODO: Find a way to redraw only the changed rows
            this.redraw();
        }, () => {
            this.saveAllButton.disable();
            this.saveAllButton.setLevel(Level.ERROR);
            this.saveAllButton.setLabel("Failed!");
            setTimeout(() => {
                this.saveAllButton.enable();
                this.redraw();
            }, 1000);
        });
    }

    importFromFile() {
        this.uploadFile.node.onchange = () => {
            let reader = new FileReader();
            let file = this.uploadFile.getFile();
            if (file.size > 1e8) {
                console.warn("File ", file.name, " too large. Skipping upload.");
                this.uploadFile.setValue("");
                return;
            }
            reader.onprogress = () => {
                this.importButton.setLevel(Level.WARNING);
                this.importButton.setLabel("Uploading...");
                this.importButton.disable();

                this.saveAllButton.disable();
                for (let row of this.translationTable.rows) {
                    row.options.saveButton.disable();
                }
            };
            reader.onload = (e) => {
                // readAsText below, so the result is the text and not an ArrayBuffer
                let text = (e.currentTarget as FileReader).result as string;
                let error = false;
                let errmsg = "";
                try {
                    let obj = JSON.parse(text);
                    if(Object.prototype.toString.call(obj) !== '[object Array]') {
                        error = true;
                        errmsg = "No array found!";
                    } else {
                        let changes = [];
                        for (let x of obj) {
                            if (!x.keyId) {
                                error = true;
                                errmsg = "Key id missing!";
                                break;
                            }
                            if (x.entryValue === "") {
                                continue;
                            }
                            if (!x.entryValue) {
                                error = true;
                                errmsg = "Entry value missing!";
                                break;
                            }
                            x.entryValue = x.entryValue.trim();
                            let change: {keyId: StoreId; newValue: string; languageId: StoreId; entryId?: StoreId} = {
                                keyId: x.keyId,
                                newValue: x.entryValue,
                                languageId: this.language.id
                            };
                            if (x.entryId) {
                                change.entryId = x.entryId;
                                let entry = TranslationEntry.get(x.entryId);
                                if (x.entryValue === entry.value) {
                                    continue;
                                }
                            }
                            changes.push(change);
                        }
                        if (!error) {
                            let request = {
                                editEntries: JSON.stringify(changes)
                            };
                            ajaxCall(request, () => {
                                this.redraw();
                            });
                        }
                    }
                } catch (ex) {
                    error = true;
                    errmsg = ex.message;
                }

                let timeout;
                if (error) {
                    this.importButton.setLevel(Level.ERROR);
                    this.importButton.setLabel(errmsg);
                    timeout = 2000;
                } else {
                    this.importButton.setLevel(Level.SUCCESS);
                    this.importButton.setLabel("Successfully uploaded!");
                    timeout = 700;
                }
                setTimeout(() => {
                    this.importButton.enable();
                    this.importButton.setLevel(Level.INFO);
                    this.importButton.setLabel("Import");

                    this.saveAllButton.enable();
                    for (let row of this.translationTable.rows) {
                        row.options.saveButton.enable();
                    }
                }, timeout);
                this.uploadFile.setValue("");
            };
            reader.readAsText(file);
        }
    }

    exportToFile() {
        let language = this.language;
        let keyEntryMap = new Map();
        for (let entry of TranslationEntry.all()) {
            if (entry.getLanguage().id === language.id) {
                keyEntryMap.set(entry.getTranslationKey().id, entry);
            }
        }

        const output = TranslationKey.all().map((key) => {
            const entry = keyEntryMap.get(key.id);
            return {
                keyId: key.id,
                entryId: entry ? entry.id: "",
                keyValue: key.value,
                entryValue: entry ? entry.value: "",
            };
        });
        let file = new Blob([JSON.stringify(output, null, 2)], {type:'text/plain;charset=utf-8'});

        FileSaver.saveAs(file, "translations.json");
    }
}

class TranslationKeyTableRow extends TableRow {
    declare deleteButton: Button;
    declare oldTextElementValue: string;
    declare renameButton: Button;
    declare renameState: boolean;
    declare textElement: TextUIElement;
    declare textInput: TextInput;
    setOptions(options: typeof this.options) {
        super.setOptions(options);
    }

    onMount() {
        super.onMount();
        this.deleteButton.addClickListener(() => {
            this.deleteKey();
        });
        this.renameButton.addClickListener(() => {
            this.rename();
        });
    }

    redraw() {
        super.redraw();
        this.textInput.hide();
        this.renameState = false;

        let editable = this.options.entry.editable;
        if (!editable) {
            this.renameButton.hide();
            this.deleteButton.hide();
        } else {
            this.renameButton.show();
            this.deleteButton.show();
        }
    }

    deleteKey() {
        let key = this.options.entry.key;
        let table = this.options.entry.table;
        let request = {
            editKeys: JSON.stringify({
                    type: "delete",
                    keyId: key.id
                })
        };
        table.changed = true;
        this.hide();
        ajaxCall(request, () => {
            this.options.entry.table.changed = true;
            TranslationKey.applyDeleteEvent({objectId: key.id});
            for (let entry of TranslationEntry.all()) {
                if (entry.translationKeyId == key.id) {
                    TranslationEntry.applyDeleteEvent({objectId: entry.id});
                }
            }
        });
    }

    rename() {
        if (!this.renameState) {
            this.renameButton.setLabel("Save");
            this.textInput.setValue(this.textElement.getValue());
            this.oldTextElementValue = this.textElement.getValue();
            this.textElement.setValue("");
            this.textInput.show();
            this.renameState = true;
        } else {
            this.renameButton.setLabel("Rename");
            this.textInput.hide();
            if (this.textInput.getValue() != "") {
                this.textElement.setValue(this.textInput.getValue());

                let value = this.textInput.getValue();
                let key = this.options.entry.key;
                let request = {
                    editKeys: JSON.stringify({
                            type: "rename",
                            keyId: key.id,
                            newValue: value
                        })
                };
                ajaxCall(request, () => {
                    this.options.entry.table.changed = true;
                    this.options.entry.table.redraw();
                });
            } else {
                this.textElement.setValue(this.oldTextElementValue);
            }
            this.renameState = false;
        }
    }

}

type TranslationKeyRow = ReturnType<TranslationKeyTable["getEntries"]>[number];

class TranslationKeyTable extends Table {
    declare changed: boolean;
    declare editable: boolean;

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.editable = false;
    }

    getRowClass() {
        return TranslationKeyTableRow;
    }

    getDefaultColumns() {
        const numberStyle = {
            textAlign: "right"
        };

        return [{
            value: (entry: TranslationKeyRow) => entry.key.id,
            headerName: "Key ID",
            sortDescending: true,
            cellStyle: numberStyle,
            headerStyle: numberStyle,
        }, {
            value: (entry: TranslationKeyRow) => [
                <UI.TextElement ref="textElement" value={entry.key.value}/>,
                <TextInput ref="textInput"/>
            ],
            headerName: "Entry value",
            sortDescending: true,
            cellStyle: numberStyle,
            headerStyle: numberStyle,
        }, {
            value: (entry: TranslationKeyRow) => {
                return [
                    <div className="btn-group">
                        <Button ref="renameButton" label="Rename" level={Level.INFO}/>
                        <Button ref="deleteButton" label="Delete" level={Level.DANGER}/>
                    </div>
                ];
            },
            headerName: "Actions",
            sortDescending: true,
        }];
    }

    onMount() {
        super.onMount();
        this.changed = false;
    }

    getEntryKey(entry: TranslationKeyRow, index: number) {
        return index;
    }

    getEntries() {
        return TranslationKey.all().map((key) => ({key: key, table: this, editable: this.editable}));
    }

    makeEditable() {
        this.editable = true;
        this.redraw();
    }

    makeNoneditable() {
        this.editable = false;
        this.redraw();
    }
}

export interface TranslationKeyManagerOptions {
}

class TranslationKeyManager extends UI.Element {
    declare options: ElementOptions<TranslationKeyManagerOptions>;

    declare addStatus: TextUIElement;
    declare changed: boolean;
    declare editableCheckbox: RawCheckboxInput;
    declare saveButton: Button;
    declare table: TranslationKeyTable;
    declare textArea: TextArea;

    render() {
        let style = {
            display: "inline-block",
            overflow: "auto",
            resize: "none",
            height: "46px",
            width: "300px",
            verticalAlign: "top"
        };

        return [
            <label>Enable editing: &nbsp; </label>,
            <RawCheckboxInput ref="editableCheckbox" />,
            <TranslationKeyTable ref="table"/>,
            <TextArea ref="textArea" className="form-control" style={style}/>,
            <Button label="Add keys" ref="saveButton" style={{marginLeft: "20px"}} level={Level.INFO}/>,
            <UI.TextElement ref="addStatus" />
        ];
    }

    onMount() {
        super.onMount();
        this.changed = false;
        this.saveButton.addClickListener(() => {
            this.saveKeys();
        });
        this.editableCheckbox.addClickListener(() => {
           this.switchEditable();
        });
    }

    switchEditable() {
        if (this.editableCheckbox.getValue()) {
            this.table.makeEditable();
        } else {
            this.table.makeNoneditable();
        }
    }

    hasChanged() {
        return this.table.changed || this.changed;
    }

    setUnchanged() {
        this.table.changed = false;
        this.changed = false;
    }

    redraw() {
        super.redraw();
    }

    saveKeys() {
        let value = this.textArea.getValue();
        this.textArea.setValue("");

        let request = {
            editKeys: JSON.stringify({
                    type: "add",
                    keys: value
                })
        };
        this.saveButton.disable();
        this.changed = true;
        ajaxCall(request, (data) => {
            this.saveButton.setLabel("Success!");
            this.saveButton.setLevel(Level.SUCCESS);
            this.textArea.setValue("");
            this.changed = true;
            this.addStatus.setValue(data.keyInfo.added + " keys added, " + data.keyInfo.alreadyExists + " keys already exists");
            setTimeout(() => {
                this.saveButton.enable();
                this.saveButton.setLabel("Add keys");
                this.saveButton.setLevel(Level.INFO);
                this.addStatus.setValue("");
                this.table.redraw();
            }, 2000);
        }, () => {
            this.saveButton.setLabel("Failed!");
            this.saveButton.setLevel(Level.ERROR);
            setTimeout(() => {
                this.saveButton.enable();
                this.saveButton.setLabel("Add keys");
                this.saveButton.setLevel(Level.INFO);
            }, 700);
        });
    }
}

class TranslationManager extends UI.Element {
    declare entryManager: TranslationEntryManager;
    declare initialUrlParts: string[];
    declare keyManager: TranslationKeyManager;
    declare tabArea: TabArea;

    getUrlPrefix(urlPart: string) {
        let url = "/manage/translation/";
        if (urlPart) {
            url += urlPart + "/";
        }
        return url;
    }

    render() {
        return [
            <TabArea ref="tabArea">
                <TranslationKeyManager ref="keyManager" tabHref={this.getUrlPrefix("keys")} title="Edit keys" active/>
                <TranslationEntryManager ref="entryManager" tabHref={this.getUrlPrefix("entries")} title="Edit entries"/>
            </TabArea>
        ];
    }

    setURL(urlParts: string[]) {
        if (!this.tabArea) {
            this.initialUrlParts = urlParts;
        } else {
            this.showUrlTab(urlParts[0] || "keys");
        }
    }

    onMount() {
        super.onMount();

        this.setURL(this.initialUrlParts);
        delete this.initialUrlParts;

        this.tabArea.titleArea.addClass("text-center");

        // A tab panel is a UIElement, which is more than the children array can say
        (this.tabArea.children[1] as UIElement).addClickListener(() => {
            if (this.keyManager.hasChanged()) {
                this.entryManager.redraw();
                this.keyManager.setUnchanged();
            }
        });
    }

    showUrlTab(urlPart: string) {
        if (urlPart === "keys") {
            this.keyManager.dispatch("show");
        } else if (urlPart === "entries") {
            this.entryManager.dispatch("show");
            if (this.keyManager.hasChanged()) {
                this.entryManager.redraw();
                this.keyManager.setUnchanged();
            }
        }
    }
}

export {TranslationManager};
