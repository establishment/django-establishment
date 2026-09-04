import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {Article} from "../../../content/js/state/Article";


@globalStore
export class DocumentationEntry extends BaseStore("DocumentationEntry") {
    declare articleId: number;
    declare name?: string;
    declare parentId?: number;
    declare id: number;
    declare parentIndex: number;
    declare urlName?: string;

    getArticle() {
        let article = Article.get(this.articleId);
        return article && article.getTranslation();
    }

    getParent() {
        return DocumentationEntry.get(this.parentId);
    }

    toString() {
        return this.getName();
    }

    getFullURL(): string {
        let parent = this.getParent();
        if (parent) {
            return parent.getFullURL() + "/" + this.urlName;
        } else {
            return this.urlName;
        }
        return "";
    }

    getName() {
        return this.name || this.getArticle().name;
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
