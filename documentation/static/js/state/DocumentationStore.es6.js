import {GenericObjectStore, StoreObject} from "Store";
import {ArticleStore} from "ArticleStore";
import * as Utils from "Utils";

class DocumentationEntry extends StoreObject {
    getArticle() {
        let article = ArticleStore.get(this.articleId);
        return article && article.getTranslation();
    }

    getParent() {
        return DocumentationEntryStore.get(this.parentId);
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
        for (let documentationEntry of DocumentationEntryStore.all()) {
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

class DocumentationEntryStoreClass extends GenericObjectStore {
    constructor() {
        super("DocumentationEntry", DocumentationEntry);
    }
}

let DocumentationEntryStore = new DocumentationEntryStoreClass();

export {DocumentationEntryStore}
