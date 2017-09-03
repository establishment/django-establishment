import {Ajax} from "Ajax";
import {GlobalState} from "State";
import {UI, Button, Panel, getOffset, ActionModal, ActionModalButton, Form, FormField, TextInput, Select} from "UI";
import {Draggable} from "Draggable";
import {ArticleSwitcher} from "ArticleRenderer";
import {Dispatcher} from "Dispatcher";

import {DocumentationEntryStore} from "./state/DocumentationStore";
import {DocumentationPanel} from "./DocumentationPanel";
import {DraggableDocumentationNavElement, dragAndDropHandler} from "./DocumentationNavElement";
import {CreateEntryButton} from "./CreateEntryModal";

import {Orientation, Level, Size} from "ui/Constants";

export class AdminDocumentationPanel extends DocumentationPanel {
    getBaseUrl() {
        return "/docs/edit/";
    }

    getDocumentationEntry() {
        let documentationEntry = DocumentationEntryStore.get(1);
        documentationEntry.getEntries = function() {
            let entries = [];
            for (let documentationEntry of DocumentationEntryStore.all()) {
                if ((documentationEntry.parentId === this.id || !documentationEntry.parentId) && documentationEntry.id !== this.id) {
                    entries.push(documentationEntry);
                }
            }
            entries.sort((a, b) => {
                return a.getParentIndex() - b.getParentIndex();
            });

            return entries;
        };

        return documentationEntry;
    }

    render() {
        const documentationEntry = this.getDocumentationEntry();
        return [
            <Panel orientation={Orientation.HORIZONTAL} className={this.styleSheet.panel} key="container">
                <Panel ref="navPanel" className={this.styleSheet.navPanel}>
                    <div style={{maxHeight: "90%", overflowY: "auto"}} key="navigationContainer">
                        <DraggableDocumentationNavElement
                            ref="root"
                            documentationEntry={documentationEntry}
                            isRoot={true}
                            panel={this}
                            level={0}
                            documentationSwitchDispatcher={this.documentationSwitchDispatcher}
                        />
                    </div>
                    <div style={{position: "absolute", bottom: "5%"}}>
                        <Button ref="trash" faIcon="trash" disabled
                                level={Level.WARNING} size={Size.EXTRA_LARGE}
                                style={{marginLeft: "50px", padding: "16px 22px"}} />
                        <CreateEntryButton faIcon="plus"
                                        level={Level.PRIMARY} size={Size.EXTRA_LARGE}
                                        style={{marginLeft: "50px", padding: "16px 22px"}} />
                    </div>
                </Panel>
                <Panel className={this.styleSheet.article}>
                    <ArticleSwitcher
                        ref="articleSwitcher"
                        initialArticle={documentationEntry.getArticle()}
                        lazyRender
                        showEditButton={true}
                        className={this.styleSheet.articleSwitcher}/>
                </Panel>
           </Panel>
        ]
    }

    checkUrl(urlParts, documentationEntry) {
        return "edit/" + documentationEntry.getFullURL() === urlParts.join("/");
    }

    getNavElement(entry) {
        let explore = (entryNavElement) => {
            if (entryNavElement.getDocumentationEntry() === entry) {
                return entryNavElement;
            }
            let navElement = null;
            for (let subEntry of entryNavElement.subEntries) {
                navElement = navElement || explore(subEntry);
            }
            return navElement;
        };
        explore(this.root);
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
        Ajax.postJSON("/docs/change_parents/",{modifiedEntries: JSON.stringify(modified)});
    }

    setTarget(element, eventType, borderType, visibleEntries) {
        for (let visibleElement of visibleEntries) {
            visibleElement.titleElement.setStyle("border", "");
            visibleElement.titleElement.setStyle("border-top", "");
            visibleElement.titleElement.setStyle("border-bottom", "");
        }
        this.trash.setLevel(Level.WARNING);
        if (!element) {
            this.trash.setLevel(Level.DANGER);
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
        let exploreAndUncollapse = (entryNavElement) => {
            if (entryNavElement.getDocumentationEntry() === entry) {
                return;
            }
            if (visibleEntries.indexOf(entryNavElement.getDocumentationEntry()) !== -1
                    && entryNavElement.getDocumentationEntry().parentId) {
                let parentEntry = DocumentationEntryStore.get(entryNavElement.getDocumentationEntry().parentId);
                let parentEntryNavElement = this.getNavElement(parentEntry);
                if (parentEntryNavElement && parentEntryNavElement.titleElement.options.shouldToggle) {
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
        this.attachCreateListener(DocumentationEntryStore, (entry) => {
            this.attachUpdateListener(entry, () => {
                this.focusToDocumentationEntry(entry);
            });
        }, true);
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
                    this.redraw();
                    this.focusToDocumentationEntry(entry);
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
