import {StoreObject, GenericObjectStore} from "Store";
import {ArticleStore} from "ArticleStore";

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

var BlogEntryStore = new BlogEntryStoreClass();

export {BlogEntryStore};
