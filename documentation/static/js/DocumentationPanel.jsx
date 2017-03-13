import {UI} from "UI";
import {ArticleSwitcher} from "ArticleRenderer";
import {DocumentationEntryStore} from "DocumentationStore";
import {Dispatcher} from "Dispatcher";
import {URLRouter} from "URLRouter";
import {FACollapseIcon} from "FontAwesome";
import {css, hover, focus, active, ExclusiveClassSet, StyleSet} from "Style";


class DocumentationStyle extends StyleSet {
    constructor() {
        super({
            updateOnResize: true,
        });

        this.panel = this.css({
            height: "100%",
        });

        this.navPanel = this.css({
            // "width": "384px",
            "width": "20%",
            "max-width": "20%",
            height: "100%",
            display: "inline-block",
            float: "left",
            "background-color": "#f2f4f9",
            color: "#252525",
            "overflow-x": "auto",
            "overflow-y": "auto",
        });

        this.article = this.css({
            "min-width": "80%",
            "max-width": "80%",
            "background-color": "#f2f4f9",
            "min-height": "100%",
            "max-height": "100%",
            "height": "100%",
            display: "inline-block",
            "overflow-x": "hidden",
            "overflow-y": "scroll",
        });

        this.articleSwitcher = this.css({
            "width": "960px",
            "max-width": "100%",
            "text-align": "justify", // TODO: DO WE WANT THIS ?
            "padding-top": "25px", // TODO: HERE, A BETTER PADDING
            "padding-bottom": "30px",
            "min-height": "100%",
            "margin-bottom": "-5px",
            display: "inline-block",
            "padding-left": "5%",
            "padding-right": "5%",
            // "padding-right": "16.6%",
            "background-color": "#fff",
        });

        this.navElementDiv = this.css({
            "font-size": "14px",
            "padding-left": "12px",
            "padding-top": ".75em",
            "padding-bottom": ".75em",
        });
        
        this.documentationPanel = this.css({
            // TODO: Delete this margin on the stemjs website, this is suitable only for navbar dumb padding
            // "margin-top": "-20px",
            "height": () => (window.innerHeight - 45) + "px",
            "overflow": "hidden",
            "position": "absolute",
            "min-width": "100%",
            "max-width": "100%",
            "background-color": "#fff",
        });
    }
}
let documentationStyle = new DocumentationStyle();

class CollapseIconClass extends FACollapseIcon {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        if (this.options.collapsed) {
            // attr.setStyle("margin-left", "-2px");
        } else {
            // this is not really a hack, but we might want this with em?
            attr.setStyle("margin-left", "-2px");
            attr.setStyle("margin-right", "2px");
        }

        return attr;
    }

    onMount() {
        this.addClickListener((event) => {
            event.stopPropagation();
            this.options.parent.toggleCollapsed();
        });
    }
}

class DocumentationNavElementContent extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(documentationStyle.navElementDiv); // TODO: add this later

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
        if (collapsed) {
            this.dispatch("hideSubEntries");
        } else {
            this.dispatch("showSubEntries");
        }
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
                this.setCollapsed(false);
            }
        });

        // this.attachListener(this.options.documentationSwitchDispatcher, () => {
        //     this.setActive(true);
        // });
    }
}

function DocumentationNavElement(ContentClass) {
    return class DocumentationNavElementClass extends UI.Element {
        setOptions(options) {
            options = Object.assign({
                collapsed: true
            }, options);
            super.setOptions(options);
        }

        getNodeAttributes() {
            let attr = super.getNodeAttributes();
            let level = Math.max(this.options.level || 0, 0);

            attr.setStyle("cursor", "pointer");
            attr.setStyle("paddingLeft", (level > 0 ? 12 : 0) + "px");

            return attr;
        }

        getDocumentationEntry() {
            return this.options.documentationEntry;
        }

        render() {
            let level = this.options.level || 0;
            let collapsed = this.options.collapsed && !this.options.isRoot;

            this.subEntries = this.getDocumentationEntry().getEntries(); // TODO: This might be crap; needed for listener

            this.subEntries = this.subEntries.map(subEntry => <DocumentationNavElementClass
                documentationEntry={subEntry}
                level={this.options.isRoot ? level : level + 1}
                panel={this.options.panel}
                documentationSwitchDispatcher={this.options.documentationSwitchDispatcher}
            />);

            let content = <ContentClass
                ref="titleElement"
                documentationEntry={this.getDocumentationEntry()}
                shouldToggle={this.subEntries.length && !this.options.isRoot}
                collapsed={collapsed}
                documentationSwitchDispatcher={this.options.documentationSwitchDispatcher}
                parent={this}
            />;

            return [
                content,
                // TODO: should be hidden, depending on collapsed
                // TODO: do something consistent about this hidden stuff
                <div ref="subEntryArea" className={collapsed ? "hidden" : ""}>
                    {this.subEntries}
                </div>
            ]
        }

        showArticle() {
            let documentationEntry = this.getDocumentationEntry();
            this.options.panel.setArticle(documentationEntry);
        }

        onMount() {
            // TODO: a bit too many listeners here, should probably be done the other way around?
            this.titleElement.addListener("hideSubEntries", () => {
                this.subEntryArea.hide();
            });

            this.titleElement.addListener("showSubEntries", () => {
                this.subEntryArea.show();
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
    }
}

class DocumentationPanel extends UI.Element {
    constructor() {
        super(...arguments);
        this.documentationSwitchDispatcher = new Dispatcher();
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(documentationStyle.documentationPanel);

        return attr;
    }

    render() {
        let documentationEntry = DocumentationEntryStore.get(this.options.documentationEntryId);
        let DocumentationNavElementClass = DocumentationNavElement(DocumentationNavElementContent);
        return [
            <UI.Panel orientation={UI.Orientation.HORIZONTAL} className={documentationStyle.panel}>
                <UI.Panel ref="navPanel" className={documentationStyle.navPanel}>
                    <DocumentationNavElementClass
                        documentationEntry={documentationEntry}
                        isRoot={true}
                        panel={this}
                        level={0}
                        documentationSwitchDispatcher={this.documentationSwitchDispatcher}
                    />
                </UI.Panel>
                <UI.Panel ref="articlePanel" className={documentationStyle.article}>
                    <ArticleSwitcher
                        ref="articleSwitcher"
                        initialArticle={documentationEntry.getArticle()}
                        lazyRender
                        className={documentationStyle.articleSwitcher}/>
                </UI.Panel>
           </UI.Panel>
        ]
    }

    setArticle(documentationEntry) {
        this.articleSwitcher.setActive(documentationEntry.getArticle()); // Do we want to use this or we want to use id? And what's the difference?
        this.articlePanel.node.scrollTop = 0;
        URLRouter.route(documentationEntry.getFullURL());
    }

    focusToDocumentationEntry(documentationEntry) {
        documentationEntry.dispatch("show");
        while (documentationEntry) {
            documentationEntry.dispatch("setCollapsed", false);
            documentationEntry = documentationEntry.getParent();
        }
    }

    onMount() {
        super.onMount();
        let handleLocation = (location) => {
            if (!location) {
                return;
            }
            try {
                // I need this because if not the url would be an object and getFullURL() returns a string
                let url = location.location; // This is definitely not good. Another name here.
                url = url.substr(1);
                let allURLs = DocumentationEntryStore.all();
                for (let documentationEntry of allURLs) { // Not like this: Change the name of 'allURLs'
                    if (documentationEntry.getFullURL() === url) {
                        this.focusToDocumentationEntry(documentationEntry);
                        return;
                    }
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };

        handleLocation(URLRouter.getLocation());
        URLRouter.addRouteListener(handleLocation);
    }
}

export {DocumentationPanel, DocumentationStyle, DocumentationNavElement, DocumentationNavElementContent}
