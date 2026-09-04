import {UI, type ElementOptions, type NodeAttributes} from "../../../stemjs/ui/UIBase";
import {type StoreId} from "../../../stemjs/state/State";
import {Orientation} from "../../../stemjs/ui/Constants";
import {Router} from "../../../stemjs/ui/Router";
import {registerStyle} from "../../../stemjs/ui/style/Theme";
import {Dispatcher} from "../../../stemjs/base/Dispatcher";

import {ArticleSwitcher} from "../../content/js/ArticleRenderer";
import {DocumentationEntry} from "./state/DocumentationStore";
import {SimpleDocumentationNavElement} from "./DocumentationNavElement";
import {DocumentationStyle} from "./DocumentationStyle";

export interface DocumentationPanelOptions {
    documentationEntryId?: StoreId;
}

@registerStyle(DocumentationStyle)
class DocumentationPanel extends UI.Element {
    declare options: ElementOptions<DocumentationPanelOptions>;
    declare articleSwitcher: ArticleSwitcher;
    declare documentationSwitchDispatcher: Dispatcher;
    declare initialUrlParts: string[];

    constructor() {
        super(...arguments);
        this.documentationSwitchDispatcher = new Dispatcher();
    }

    extraNodeAttributes(attr: NodeAttributes) {
        attr.addClass(this.styleSheet.documentationPanel);
    }

    getDocumentationEntry() {
        return DocumentationEntry.get(this.options.documentationEntryId);
    }

    render() {
        const documentationEntry = this.getDocumentationEntry();
        return [
            <UI.Element orientation={Orientation.HORIZONTAL} className={this.styleSheet.panel}>
                <UI.Element ref="navPanel" className={this.styleSheet.navPanel}>
                    <SimpleDocumentationNavElement
                        documentationEntry={documentationEntry}
                        isRoot={true} panel={this}
                        level={0} documentationSwitchDispatcher={this.documentationSwitchDispatcher}
                    />
                </UI.Element>
                <UI.Element className={this.styleSheet.article}>
                    <ArticleSwitcher ref="articleSwitcher" className={this.styleSheet.articleSwitcher}
                                     initialArticle={documentationEntry.getArticle()} lazyRender />
                </UI.Element>
           </UI.Element>
        ]
    }

    getBaseUrl() {
        return "/docs/";
    }

    getUrlPrefix(suffix?: string) {
        let url = this.getBaseUrl();
        if (suffix) {
            url += suffix + "/";
        }
        return url;
    }

    checkUrl(urlParts: string[], documentationEntry: DocumentationEntry) {
        return documentationEntry.getFullURL() === urlParts.join("/");
    }

    setURL(urlParts: string[]) {
        if (this.articleSwitcher) {
            for (let documentationEntry of DocumentationEntry.all()) {
                if (this.checkUrl(urlParts, documentationEntry)) {
                    this.focusToDocumentationEntry(documentationEntry);
                    return;
                }
            }
        } else {
            this.initialUrlParts = urlParts;
        }
    }

    setArticle(documentationEntry: DocumentationEntry) {
        this.articleSwitcher.setActive(documentationEntry.getArticle());
        Router.changeURL(this.getUrlPrefix(documentationEntry.getFullURL()));
    }

    focusToDocumentationEntry(documentationEntry: DocumentationEntry) {
        documentationEntry.dispatch("show");
        this.uncollapsePathTo(documentationEntry);
    }

    uncollapsePathTo(documentationEntry: DocumentationEntry) {
        while (documentationEntry) {
            documentationEntry.dispatch("setCollapsed", false);
            documentationEntry = documentationEntry.getParent();
        }
    }

    onMount() {
        this.setURL(this.initialUrlParts);
        delete this.initialUrlParts;
    }
}

export {DocumentationPanel};
