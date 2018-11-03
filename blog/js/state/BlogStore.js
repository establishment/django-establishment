import {StoreObject, GenericObjectStore} from "state/Store";

import {ArticleStore} from "state/ArticleStore";

class BlogEntry extends StoreObject {
    getArticle() {
        return ArticleStore.get(this.articleId);
    }
}

class BlogEntryStoreClass extends GenericObjectStore {
    constructor(objectType="BlogEntry", ObjectWrapper=BlogEntry) {
        super(objectType, ObjectWrapper, {
            dependencies: ["Article"],
        });
    }

    getEntryForURL(urlName) {
        return this.all().find(blogEntry => blogEntry.urlName === urlName);
    }
}

export const BlogEntryStore = new BlogEntryStoreClass();
