import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Orientation} from "../../../stemjs/src/ui/Constants.js";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {Router} from "../../../stemjs/src/ui/Router.jsx";
import {registerStyle} from "../../../stemjs/src/ui/style/Theme.js";
import {Dispatcher} from "../../../stemjs/src/base/Dispatcher.js";

import {ArticleSwitcher} from "../../content/js/ArticleRenderer.jsx";
import {DocumentationEntryStore} from "./state/DocumentationStore.js";
import {SimpleDocumentationNavElement} from "./DocumentationNavElement.jsx";
import {DocumentationStyle} from "./DocumentationStyle.js";

@registerStyle(DocumentationStyle)
class DocumentationPanel extends UI.Element {
    constructor() {
        super(...arguments);
        this.documentationSwitchDispatcher = new Dispatcher();
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.documentationPanel);
    }

    getDocumentationEntry() {
        return DocumentationEntryStore.get(this.options.documentationEntryId);
    }

    render() {
        const documentationEntry = this.getDocumentationEntry();
        return [
            <Panel orientation={Orientation.HORIZONTAL} className={this.styleSheet.panel}>
                <Panel ref="navPanel" className={this.styleSheet.navPanel}>
                    <SimpleDocumentationNavElement
                        documentationEntry={documentationEntry}
                        isRoot={true} panel={this}
                        level={0} documentationSwitchDispatcher={this.documentationSwitchDispatcher}
                    />
                </Panel>
                <Panel className={this.styleSheet.article}>
                    <ArticleSwitcher ref="articleSwitcher" className={this.styleSheet.articleSwitcher}
                                     initialArticle={documentationEntry.getArticle()} lazyRender />
                </Panel>
           </Panel>
        ]
    }

    getBaseUrl() {
        return "/docs/";
    }

    getUrlPrefix(suffix) {
        let url = this.getBaseUrl();
        if (suffix) {
            url += suffix + "/";
        }
        return url;
    }

    checkUrl(urlParts, documentationEntry) {
        return documentationEntry.getFullURL() === urlParts.join("/");
    }

    setURL(urlParts) {
        if (this.articleSwitcher) {
            for (let documentationEntry of DocumentationEntryStore.all()) {
                if (this.checkUrl(urlParts, documentationEntry)) {
                    this.focusToDocumentationEntry(documentationEntry);
                    return;
                }
            }
        } else {
            this.initialUrlParts = urlParts;
        }
    }

    setArticle(documentationEntry) {
        this.articleSwitcher.setActive(documentationEntry.getArticle());
        Router.changeURL(this.getUrlPrefix(documentationEntry.getFullURL()));
    }

    focusToDocumentationEntry(documentationEntry) {
        documentationEntry.dispatch("show");
        this.uncollapsePathTo(documentationEntry);
    }

    uncollapsePathTo(documentationEntry) {
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
