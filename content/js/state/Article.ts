import {FetchStoreMixin} from "../../../../stemjs/src/state/mixins/FetchStoreMixin";
import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";

import {User} from "../../../../csaaccounts/js/state/UserStore";
import {Language} from "../../../localization/js/state/LanguageStore.js";
import {StoreId} from "../../../../stemjs/src/state/State";

@globalStore
export class Article extends FetchStoreMixin("Article", {
    fetchURL: "/fetch_article/",
    maxFetchObjectCount: 32,
}) {
    declare userCreatedId: number;
    declare baseArticleId?: number;
    declare languageId?: number;
    declare title?: string;
    declare content?: string;
    edits: Map<StoreId, ArticleEdit>;

    constructor(obj: any) {
        super(obj);
        this.edits = new Map();
    }

    canBeEditedByUser(user: User = USER): boolean {
        return user.isSuperUser || this.userCreatedId == user.id;
    }

    addEdit(articleEdit: ArticleEdit): void {
        this.edits.set(articleEdit.id, articleEdit);
    }

    getEdits(): ArticleEdit[] {
        return Array.from(this.edits.values());
    }

    getTranslation(language: any = Language.Locale): Article {
        for (const article of Article.all()) {
            if (article.baseArticleId === this.id && article.languageId === language.id) {
                return article;
            }
        }
        return this;
    }

    getBaseArticle(): Article {
        return Article.get(this.baseArticleId) || this;
    }

    static getTranslation(id: number, language: any = Language.Locale): Article | null {
        let baseArticle = this.get(id);
        if (baseArticle) {
            baseArticle = baseArticle.getTranslation(language);
        }
        return baseArticle;
    }
}

@globalStore
export class ArticleEdit extends BaseStore("articleedit", {dependencies: ["article"]}) {
    declare articleId: number;

    getArticle(): Article | null {
        return Article.get(this.articleId);
    }
}

ArticleEdit.addCreateListener((articleEdit: ArticleEdit) => {
    const article = articleEdit.getArticle();
    if (article) {
        article.addEdit(articleEdit);
    }
});
