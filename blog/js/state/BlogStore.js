import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {ArticleStore} from "../../../content/js/state/ArticleStore.ts";

@globalStore
class BlogEntry extends BaseStore("BlogEntry", {dependencies: ["Article"]}) {
    getArticle() {
        return ArticleStore.get(this.articleId);
    }

    static getEntryForURL(urlName) {
        return this.all().find(blogEntry => blogEntry.urlName === urlName);
    }
}

export const BlogEntryStore = BlogEntry;
