import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/OldStore";
import {ArticleStore} from "../../../content/js/state/ArticleStore.ts";

class BlogEntry extends StoreObject {
    getArticle() {
        return ArticleStore.get(this.articleId);
    }
}

class BlogEntryStoreClass extends GenericObjectStore {
    constructor(objectType="BlogEntry", ObjectClass=BlogEntry) {
        super(objectType, ObjectClass, {
            dependencies: ["Article"],
        });
    }

    getEntryForURL(urlName) {
        return this.all().find(blogEntry => blogEntry.urlName === urlName);
    }
}

export const BlogEntryStore = new BlogEntryStoreClass();
