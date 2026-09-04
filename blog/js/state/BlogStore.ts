import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {type StoreId} from "../../../../stemjs/state/State";
import {Article} from "../../../content/js/state/Article";

@globalStore
export class BlogEntry extends BaseStore("BlogEntry", {dependencies: ["Article"]}) {
    declare lastActive: number; // A unix timestamp

    declare discussionId?: StoreId;
    declare visible: boolean;

    declare articleId?: StoreId;
    declare urlName: string;

    getArticle() {
        return Article.get(this.articleId);
    }

    static getEntryForURL(urlName) {
        return this.all().find(blogEntry => blogEntry.urlName === urlName);
    }
}
