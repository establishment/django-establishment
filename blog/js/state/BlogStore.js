import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {Article} from "../../../content/js/state/Article.ts";

@globalStore
export class BlogEntry extends BaseStore("BlogEntry", {dependencies: ["Article"]}) {
    getArticle() {
        return Article.get(this.articleId);
    }

    static getEntryForURL(urlName) {
        return this.all().find(blogEntry => blogEntry.urlName === urlName);
    }
}
