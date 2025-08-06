import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {ArticleStore} from "../../../content/js/state/ArticleStore.ts";

@globalStore
class DocumentationEntry extends BaseStore("DocumentationEntry") {
    getArticle() {
        let article = ArticleStore.get(this.articleId);
        return article && article.getTranslation();
    }

    getParent() {
        return DocumentationEntry.get(this.parentId);
    }

    toString() {
        return this.getName();
    }

    getFullURL() {
        let parent = this.getParent();
        if (parent) {
            return parent.getFullURL() + "/" + this.urlName;
        } else {
            return this.urlName;
        }
        return "";
    }

    getName() {
        return this.name || this.getArticle().getName();
    }

    getParentIndex() {
        return this.parentIndex || this.id;
    }

    getEntries() {
        let entries = [];
        for (let documentationEntry of DocumentationEntry.all()) {
            if (documentationEntry.parentId === this.id) {
                entries.push(documentationEntry);
            }
        }
        entries.sort((a, b) => {
            return a.getParentIndex() - b.getParentIndex();
        });

        return entries;
    }
}

let DocumentationEntryStore = DocumentationEntry;

export {DocumentationEntryStore}
