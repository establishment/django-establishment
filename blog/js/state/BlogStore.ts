import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {field} from "../../../../stemjs/state/StoreField";
import {type StoreId} from "../../../../stemjs/state/State";
import {type StemDate} from "../../../../stemjs/time/Date";
import {Article} from "../../../content/js/state/Article";

@globalStore
export class BlogEntry extends BaseStore("BlogEntry", {dependencies: ["Article"]}) {
    @field(Date) lastActive: StemDate;

    declare discussionId?: StoreId;
    declare visible: boolean;

    @field(Article) article;
    declare urlName: string;

    getArticle() {
        return this.article;
    }

    static getEntryForURL(urlName: string) {
        return this.all().find(blogEntry => blogEntry.urlName === urlName);
    }
}
