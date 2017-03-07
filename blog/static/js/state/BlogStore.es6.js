import {StoreObject, GenericObjectStore} from "Store";
import {ArticleStore} from "ArticleStore";

class BlogEntry extends StoreObject {
    getArticle() {
        return ArticleStore.get(this.articleId);
    }
}

var BlogEntryStore = new GenericObjectStore("blogentry", BlogEntry);

export {BlogEntryStore};
