import {UI} from "UI";
import {Draggable} from "Draggable";
import {Dispatcher} from "Dispatcher";
import {FACollapseIcon} from "FontAwesome";

import {DocumentationStyle} from "./DocumentationStyle";
import {EditEntryModal} from "./CreateEntryModal";

class CollapseIconClass extends FACollapseIcon {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        if (!this.options.collapsed) {
            // this is not really a hack, but we might want this with em?
            attr.setStyle("margin-left", "-2px");
            attr.setStyle("margin-right", "2px");
        }
    }

    onMount() {
        this.addClickListener((event) => {
            event.stopPropagation();
            this.options.parent.toggleCollapsed();
        });
    }
}

export class DocumentationNavElementContent extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(DocumentationStyle.getInstance().navElementDiv); // TODO: add this later

        // TODO: this should be in 2 separate classes
        if (this.options.active) {
            attr.setStyle("backgroundColor", "#2980b9");
            attr.setStyle("color", "#161616");
            attr.setStyle("fontWeight", "bold");
        } else {
            attr.setStyle("backgroundColor", "#f2f4f9");
            attr.setStyle("color", "#161616");
        }
    }

    setCollapsed(collapsed) {
        if (this.options.collapsed === collapsed) {
            return;
        }
        this.options.collapsed = collapsed;
        if (!this.options.shouldToggle) {
            return;
        }
        this.collapseIcon.setCollapsed(collapsed);
        this.dispatch("toggleCollapsed");
    }

    toggleCollapsed() {
        this.setCollapsed(!this.options.collapsed);
    }

    setActive(active) {
        this.options.active = active;
        this.redraw();

        if (active) {
			let documentationSwitchDispatcher = this.options.documentationSwitchDispatcher;

            documentationSwitchDispatcher.dispatch(this.options.documentationEntry);
            documentationSwitchDispatcher.addListenerOnce((documentationEntry) => {
                if (documentationEntry != this.options.documentationEntry) {
                    this.setActive(false);
                }
            });

            this.dispatch("setActive", active);
        }
    }

    render() {
        let collapseIcon;

        if (this.options.shouldToggle) {
            collapseIcon = <CollapseIconClass
                ref="collapseIcon"
                collapsed={this.options.collapsed}
                style={{width: "0.8em"}}
                parent={this}
            />;
        }

        // If the collapse Icon shouldn't be displayed, we should add the additional 12px width in order to keep the tags aligned
        let alignTagsStyle = {};

        if (!this.options.shouldToggle) {
            alignTagsStyle = {
                "padding-left": "12px",
            };
        }

        return [
            collapseIcon,
            <span style={alignTagsStyle}>
                {UI.T(this.options.documentationEntry.getName())}
            </span>
        ];
    }

    onMount() {
        if (this.options.active) {
            this.setActive(true);
        }

        this.addClickListener(() => {
            this.setActive(true);
            if (this.options.shouldToggle) {
                this.toggleCollapsed();
            }
        });
    }
}

export const dragAndDropHandler = new Dispatcher();
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
            EditEntryModal.show({entry: this.getDocumentationEntry()});
        });
        if (!this.options.parent.options.isRoot) {
            let totalDelta = 0;
            this.addDragListener({
                onStart: () => {
                    totalDelta = 0;
                },
                onDrag: (deltaX, deltaY) => {
                    totalDelta += deltaY;
                    if (!this.dragged && Math.abs(totalDelta) > 30) {
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
                        deltaY = totalDelta;
                    }
                    if (this.dragged) {
                        this.setStyle("left", this.getOffset("left") + deltaX + "px");
                        this.setStyle("top", this.getOffset("top") + deltaY + "px");
                        dragAndDropHandler.dispatch("drag", this, this.getOffset("top"));
                    }
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

export const DocumentationNavElement = (ContentClass) => class DocumentationNavElementClass extends UI.Element {
    getDefaultOptions() {
        return {
            collapsed: true
        };
    }

    extraNodeAttributes(attr) {
        attr.setStyle("cursor", "pointer");
        attr.setStyle("padding-left", ((this.options.level || 0) > 0 ? 12 : 0) + "px");
    }

    getDocumentationEntry() {
        return this.options.documentationEntry;
    }

    render() {
        let level = this.options.level || 0;
        let collapsed = this.options.collapsed && !this.options.isRoot;

        this.subEntries = this.subEntries || [];

        const subEntries = this.getDocumentationEntry().getEntries().map(
            (subEntry, index) => <DocumentationNavElementClass
                                    documentationEntry={subEntry}
                                    ref={this.refLinkArray("subEntries", index)}
                                    level={this.options.isRoot ? level : level + 1}
                                    panel={this.options.panel}
                                    documentationSwitchDispatcher={this.options.documentationSwitchDispatcher}
                                />
        );

        let content = <ContentClass
            ref="titleElement" documentationEntry={this.getDocumentationEntry()}
            shouldToggle={subEntries.length && !this.options.isRoot}
            collapsed={collapsed} parent={this}
            documentationSwitchDispatcher={this.options.documentationSwitchDispatcher} />;

        return [
            content,
            // TODO: should be hidden, depending on collapsed
            // TODO: do something consistent about this hidden stuff
            <div ref="subEntryArea" className={collapsed ? "hidden" : ""}>
                {subEntries}
            </div>
        ]
    }

    showArticle() {
        let documentationEntry = this.getDocumentationEntry();
        this.options.panel.setArticle(documentationEntry);
    }

    onMount() {
        // TODO: a bit too many listeners here, should probably be done the other way around?
        this.titleElement.addListener("toggleCollapsed", () => {
            this.subEntryArea.toggleClass("hidden");
        });

        this.attachListener(this.getDocumentationEntry(), "show", () => {
            this.showArticle();
            this.titleElement.setActive(true);
        });

        this.attachListener(this.getDocumentationEntry(), "setCollapsed", (collapsed) => {
            this.titleElement.setCollapsed(collapsed);
        });

        this.titleElement.addListener("setActive", (active) => {
            if (active) {
                this.showArticle();
            }
        });
    }
};

export const SimpleDocumentationNavElement = DocumentationNavElement(DocumentationNavElementContent);
export const DraggableDocumentationNavElement = DocumentationNavElement(DraggableDocumentationNavElementContent);