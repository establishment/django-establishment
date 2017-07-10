import {Ajax} from "Ajax";
import {GlobalState} from "State";
import {UI, getOffset} from "UI";
import {Draggable} from "Draggable";
import {DocumentationEntryStore} from "DocumentationStore";
import {DocumentationPanel, DocumentationStyle, DocumentationNavElement, DocumentationNavElementContent} from "DocumentationPanel";
import {ArticleSwitcher} from "ArticleRenderer";
import {Dispatcher} from "Dispatcher";

let documentationStyle = new DocumentationStyle();
let dragAndDropHandler = new Dispatcher();
let editEntryHandler = new Dispatcher();

class EditEntryModal extends UI.ActionModal {
    getTitle() {
        return "Edit documentation entry";
    }

    getActionName() {
        return "Apply";
    }

    getBody() {
        return [
            <UI.Form style={{"margin-top": "10px", "color": "initial", "font-size": "initial"}}>
                <UI.FormField label="URL name" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="urlNameInput"  value={this.options.entry.urlName}/>
                </UI.FormField>
                <UI.FormField label="Name" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="nameInput"  value={this.options.entry.name}/>
                </UI.FormField>
                <UI.FormField label="Article Id" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="articleIdInput"  value={this.options.entry.articleId} />
                </UI.FormField>
                <UI.FormField label="Parent index" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="parentIndexInput"  value={this.options.entry.parentIndex} />
                </UI.FormField>
            </UI.Form>
        ];
    }

    check(data) {
        if (!data.urlName) {
            return "URL name cannot be empty.";
        }
        if (!data.name) {
            return "Name cannot be empty.";
        }
        for (let entry of DocumentationEntryStore.all()) {
            if (entry === this.options.entry) {
                continue;
            }
            if (entry.getName() === data.name) {
                return "Name already exists.";
            }
            if (entry.urlName === data.urlName) {
                return "URL name already exists";
            }
        }
    }

    action() {
        let data = {
            entryId: this.options.entry.id,
            urlName: this.urlNameInput.getValue(),
            name: this.nameInput.getValue(),
            articleId: parseInt(this.articleIdInput.getValue()) || 0,
            parentIndex: parseInt(this.parentIndexInput.getValue()) || 0
        };
        let errorMessage = this.check(data);
        if (!errorMessage) {
            Ajax.postJSON("/docs/edit_entry/", data).then(
                (data) => {
                    if (data.error) {
                        console.log(data.error);
                    } else {
                        GlobalState.importState(data.state || {});
                        editEntryHandler.dispatch();
                    }
                },
                (error) => {
                    console.log("Error in deleting workspace:\n" + error.message);
                    console.log(error.stack);
                }
            );
        } else {
            this.messageArea.showMessage(errorMessage, "red");
        }
        this.hide();
    }
}

class DraggableDocumentationNavElementContent extends Draggable(DocumentationNavElementContent) {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("cursor", "pointer");
        return attr;
    }

    getDocumentationEntry() {
        return this.options.parent.getDocumentationEntry();
    }

    render() {
        return [
            super.render(),
            <span className="fa fa-pencil-square-o" ref="editEntry"
                  style={{"cursor": "pointer", "margin-right": "10px", "float": "right"}} />
        ]
    }

    getDirectOffsets() {
        return {
            top: this.node.offsetTop,
            left: this.node.offsetLeft,
            height: this.node.offsetHeight,
            width: this.node.offsetWidth
        };
    }

    getOffset(type) {
        return this.getDirectOffsets()[type];
    }

    onMount() {
        super.onMount();
        this.editEntry.addClickListener(() => {
            this.editModal = this.editModal || <EditEntryModal entry={this.getDocumentationEntry()} />;
            this.editModal.show();
        });
        if (!this.options.parent.options.isRoot) {
            this.addDragListener({
                onStart: () => {
                },
                onDrag: (deltaX, deltaY) => {
                    if (!this.dragged) {
                        this.dragged = true;
                        this.setStyle("cursor", "move");
                        if (this.options.shouldToggle) {
                            this.setCollapsed(true);
                        }
                        this.setStyle("position", "absolute");
                        this.setStyle("border", "2px solid red");
                        this.setStyle("border-radius", "3px");
                        this.setStyle("width", this.node.offsetWidth + 20 + "px");
                        this.setStyle("opacity", 0.85);
                    }
                    this.setStyle("left", this.getOffset("left") + deltaX + "px");
                    this.setStyle("top", this.getOffset("top") + deltaY + "px");
                    dragAndDropHandler.dispatch("drag", this, this.getOffset("top"));
                },
                onEnd: () => {
                    if (this.dragged) {
                        this.dragged = false;
                        dragAndDropHandler.dispatch("drop", this, this.getOffset("top"));
                    }
                }
            });
        }
    }
}

class CreateEntryModal extends UI.ActionModal {
    getTitle() {
        return "Create documentation entry";
    }

    getActionName() {
        return "Create";
    }

    getBody() {
        let entries = DocumentationEntryStore.all();
        entries.push({
            toString: () => {
                return "No Parent"
            },
            id: 0
        });
        return [
            <UI.Form style={{"margin-top": "10px", "color": "initial", "font-size": "initial"}}>
                <UI.FormField label="URL name" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="urlNameInput"  value=""/>
                </UI.FormField>
                <UI.FormField label="Name" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="nameInput"  value=""/>
                </UI.FormField>
                <UI.FormField label="Article Id" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="articleIdInput"  placeholder="Enter 0 (or leave blank) to create a new article instead"/>
                </UI.FormField>
                <UI.FormField label="Parent" style={{"font-weight": "initial"}}>
                    <UI.Select ref="parentInput" options={entries} activeIndex={entries.length - 1} style={{"height": "30px"}}/>
                </UI.FormField>
                <UI.FormField label="Parent index" style={{"font-weight": "initial"}}>
                    <UI.TextInput ref="parentIndexInput"  value="0"/>
                </UI.FormField>
            </UI.Form>
        ];
    }

    check(data) {
        if (!data.urlName) {
            return "URL name cannot be empty.";
        }
        if (!data.name) {
            return "Name cannot be empty.";
        }
        for (let entry of DocumentationEntryStore.all()) {
            if (entry.getName() === data.name) {
                return "Name already exists.";
            }
            if (entry.urlName === data.urlName) {
                return "URL name already exists";
            }
        }
    }

    action() {
        let data = {
            urlName: this.urlNameInput.getValue(),
            name: this.nameInput.getValue(),
            articleId: parseInt(this.articleIdInput.getValue()) || 0,
            parentId: this.parentInput.get().id,
            parentIndex: parseInt(this.parentIndexInput.getValue()) || 0
        };
        let errorMessage = this.check(data);
        if (!errorMessage) {
            Ajax.postJSON("/docs/create/", data).then(
                (data) => {
                    if (data.error) {
                        console.log(data.error);
                    } else {
                        GlobalState.importState(data.state || {});
                        this.dispatch("createdEntry");
                    }
                },
                (error) => {
                    console.log("Error in deleting workspace:\n" + error.message);
                    console.log(error.stack);
                }
            );
        } else {
            this.messageArea.showMessage(errorMessage, "red");
        }
        this.hide();
    }
}
var AddEntryButton = UI.ActionModalButton(CreateEntryModal);

class AdminDocumentationPanel extends DocumentationPanel {
    render() {
        let documentationEntry = DocumentationEntryStore.get(this.options.documentationEntryId);
        let DocumentationNavElementClass = DocumentationNavElement(DraggableDocumentationNavElementContent);
        return [
            <UI.Panel orientation={UI.Orientation.HORIZONTAL} className={documentationStyle.panel}>
                <UI.Panel ref="navPanel" className={documentationStyle.navPanel}>
                    <div style={{"max-height": "90%", "overflow-y": "auto"}}>
                        <DocumentationNavElementClass
                            ref="root"
                            documentationEntry={documentationEntry}
                            isRoot={true}
                            panel={this}
                            level={0}
                            documentationSwitchDispatcher={this.documentationSwitchDispatcher}
                        />
                    </div>
                    <div style={{"position": "absolute", "bottom": "5%"}}>
                        <div ref="trash" className="fa fa-trash fa-3x" style={{
                                                                        color: "#fff",
                                                                        "margin-left": "15px",
                                                                        "padding": "10px",
                                                                        "float": "left"
                                                                        }}> </div>
                        <AddEntryButton ref="addEntryButton" className="fa fa-plus fa-3x" level={UI.Level.PRIMARY}
                                                                    style={{
                                                                        color: "#fff",
                                                                        "margin-left": "50px"
                                                                    }} />
                    </div>
                </UI.Panel>
                <UI.Panel className={documentationStyle.article}>
                    <ArticleSwitcher
                        ref="articleSwitcher"
                        initialArticle={documentationEntry.getArticle()}
                        lazyRender
                        showEditButton={true}
                        className={documentationStyle.articleSwitcher}/>
                </UI.Panel>
           </UI.Panel>
        ]
    }

    explore() {
        this.entryNavElementMap = new Map();
        let explore = (entryNavElement) => {
            this.entryNavElementMap.set(entryNavElement.getDocumentationEntry(), entryNavElement);
            for (let subEntry of entryNavElement.subEntries) {
                explore(subEntry);
            }
        };
        explore(this.root);
    }

    redraw() {
        super.redraw();
        if (this.root) {
            this.explore();
        }
    }

    modifyEntry(entry, newParent, nextSibling) {
        let modified = [];
        if (newParent === -1) {
            modified.push({
                entryId: entry.id,
                parentId: -1
            });
            DocumentationEntryStore.applyDeleteEvent({
                objectId: entry.id
            });
        } else if (!newParent) {
            entry.parentId = null;
            entry.parentIndex = null;
            modified.push({
                entryId: entry.id,
                parentId: 0,
                parentIndex: 0
            });
        } else {
            let newBrothers = [];
            for (let docEntry of DocumentationEntryStore.all()) {
                if (docEntry.parentId === newParent.id && docEntry !== entry) {
                    newBrothers.push(docEntry);
                }
            }
            newBrothers.sort((a, b) => {
                return a.parentIndex - b.parentIndex;
            });
            entry.parentId = newParent.id;
            if (newBrothers.length) {
                newBrothers[0].parentIndex = 1;
                if (nextSibling === newBrothers[0]) {
                    entry.parentIndex = 1;
                    newBrothers[0].parentIndex = 2;
                }
                modified.push({
                    entryId: newBrothers[0].id,
                    parentIndex: newBrothers[0].parentIndex
                });
                for (let i = 1; i < newBrothers.length; i += 1) {
                    newBrothers[i].parentIndex = newBrothers[i - 1].parentIndex + 1;
                    if (newBrothers[i] === nextSibling) {
                        entry.parentIndex = newBrothers[i].parentIndex;
                        newBrothers[i].parentIndex += 1;
                    }
                    modified.push({
                        entryId: newBrothers[i].id,
                        parentIndex: newBrothers[i].parentIndex
                    });
                }
                if (!nextSibling) {
                    entry.parentIndex = newBrothers.length + 1;
                }
            }
            modified.push({
                entryId: entry.id,
                parentId: newParent.id,
                parentIndex: entry.parentIndex
            });
        }
        Ajax.postJSON("/docs/change_parents/",{"modifiedEntries": JSON.stringify(modified)}).then(
            () => {
                console.log("successfully changed parent indices!");
            },
            (error) => {
                console.log(error.message);
                console.log(error.stack);
            }
        );
    }

    setTarget(element, eventType, borderType, visibleEntries) {
        for (let visibleElement of visibleEntries) {
            visibleElement.titleElement.setStyle("border", "");
        }
        this.trash.setStyle("border", "");
        if (!element) {
            this.trash.setStyle("border", "2px solid red");
            return;
        }
        if (eventType === "drag") {
            element.titleElement.setStyle(borderType, "2px solid red");
            return [null, null, null];
        } else {
            let newParent, nextSibling;
            // Drop: add the element to its new position
            if (borderType === "border") {
                newParent = element.getDocumentationEntry();
                nextSibling = null;
                for (let docEntry of DocumentationEntryStore.all()) {
                    if (docEntry.parentId === newParent.id && (nextSibling === null || nextSibling.parentIndex > docEntry.parentIndex)) {
                        nextSibling = docEntry;
                    }
                }
            } else if (borderType === "border-top") {
                nextSibling = element.getDocumentationEntry();
                newParent = DocumentationEntryStore.get(nextSibling.parentId);
            } else {
                nextSibling = element.getDocumentationEntry();
                newParent = DocumentationEntryStore.get(nextSibling.parentId);
                nextSibling = null;
            }
            return [newParent, nextSibling];
        }
    }

    getTrashOffset() {
        // -50px for the navbar
        return getOffset(this.trash).top - 50;
    }


    redrawAndUncollapse(visibleEntries, entry) {
        this.redraw();
        let visibleEntryIds = new Set();
        for (let visibleEntry of visibleEntries) {
            visibleEntryIds.add(visibleEntry.getDocumentationEntry().id);
        }
        let exploreAndUncollapse = (entryNavElement) => {
            if (entryNavElement.getDocumentationEntry() === entry) {
                return;
            }
            if (visibleEntryIds.has(entryNavElement.getDocumentationEntry().id)
                    && entryNavElement.getDocumentationEntry().parentId) {
                let parentEntry = DocumentationEntryStore.get(entryNavElement.getDocumentationEntry().parentId);
                let parentEntryNavElement = this.entryNavElementMap.get(parentEntry);
                if (parentEntryNavElement.titleElement.options.shouldToggle) {
                    parentEntryNavElement.titleElement.setCollapsed(false);
                }
            }
            for (let subEntry of entryNavElement.subEntries) {
                exploreAndUncollapse(subEntry);
            }
        };
        exploreAndUncollapse(this.root);
    }

    getVisibleEntries(draggedItem) {
        let visibleEntries = [];
        let exploreEntries = (entryNavElement) => {
            if (entryNavElement.titleElement === draggedItem) {
                return;
            }
            visibleEntries.push(entryNavElement);
            if (!entryNavElement.titleElement.options.collapsed) {
                for (let subEntry of entryNavElement.subEntries) {
                    exploreEntries(subEntry);
                }
            }
        };
        exploreEntries(this.root);
        return visibleEntries;
    }

    onMount() {
        super.onMount();
        this.addEntryButton.modal.addListener("createdEntry", () => {
            this.redrawAndUncollapse(this.getVisibleEntries());
        });
        editEntryHandler.addListener(() => {
            this.redrawAndUncollapse(this.getVisibleEntries());
        });
        dragAndDropHandler.addListener((type, draggedItem, top) => {
            let titleHeight = 40;

            let visibleEntries = this.getVisibleEntries(draggedItem);
            if (!visibleEntries.length) {
                return;
            }

            // TODO: Refactor this! Make UIElement or NodeWrapper support direct offsets
            let getTop = (element) => {
                return element.titleElement.getOffset("top");
            };


            visibleEntries.sort((a, b) => {
                return getTop(a) - getTop(b);
            });

            let entry = draggedItem.getDocumentationEntry(), newParent = null, nextSibling = null;
            if (Math.abs(this.getTrashOffset() - top) < titleHeight * 2) {
                newParent = -1;
                this.setTarget(null, type, "border", visibleEntries);
            } else {
                if (getTop(visibleEntries[0]) > top) {
                    [newParent, nextSibling] = this.setTarget(visibleEntries[0], type, "border-top", visibleEntries);
                } else if (getTop(visibleEntries[visibleEntries.length - 1]) + titleHeight * 0.25 < top) {
                    [newParent, nextSibling] = this.setTarget(visibleEntries[visibleEntries.length - 1], type, "border-bottom", visibleEntries);
                } else {
                    let bordered = false;
                    for (let visibleEntry of visibleEntries) {
                        if (Math.abs(getTop(visibleEntry) - top) < titleHeight * 0.25) {
                            [newParent, nextSibling] = this.setTarget(visibleEntry, type, "border", visibleEntries);
                            bordered = true;
                            break;
                        }
                    }
                    if (!bordered) {
                        for (let i = 0; i < visibleEntries.length; i += 1) {
                            if (getTop(visibleEntries[i]) > top) {
                                if (i > 0 && top - getTop(visibleEntries[i - 1]) < getTop(visibleEntries[i]) - top
                                    && visibleEntries[i].getDocumentationEntry().parentId !== visibleEntries[i - 1].getDocumentationEntry().id) {
                                    [newParent, nextSibling] = this.setTarget(visibleEntries[i - 1], type, "border-bottom", visibleEntries);
                                } else {
                                    [newParent, nextSibling] = this.setTarget(visibleEntries[i], type, "border-top", visibleEntries);
                                }
                                break;
                            }
                        }
                    }
                }
            }

            if (type === "drop") {
                let changePosition = (modifyEntry) => {
                    if (modifyEntry) {
                        this.modifyEntry(entry, newParent, nextSibling);
                    }
                    this.redrawAndUncollapse(visibleEntries, entry);
                };

                if (newParent === -1) {
                    if (window.confirm("Are you sure you want to delete this entry and all it's sub-entries?")) {
                        changePosition(true)
                    } else {
                        changePosition(false);
                    }
                } else {
                    changePosition(true);
                }
            }
        });
    }
}

export {AdminDocumentationPanel};