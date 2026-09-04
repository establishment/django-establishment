import {FetchStoreMixin} from "../../../../stemjs/state/mixins/FetchStoreMixin";
import {globalStore, BaseStore} from "../../../../stemjs/state/Store";

import {User} from "../../../../csaaccounts/js/state/UserStore";
import {Language} from "../../../localization/js/state/LanguageStore";
import {type StoreId} from "../../../../stemjs/state/State";

@globalStore
export class Article extends FetchStoreMixin("Article", {
    fetchURL: "/fetch_article/",
    maxFetchObjectCount: 32,
}) {
    declare dateCreated: number;
    declare dateModified: number;
    declare dependency: string;
    declare isPublic: boolean;
    declare markup: string;
    declare name: string;
    declare version: number;
    declare compiledJSON: string;

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

    getTranslation(language: Language = Language.Locale): Article {
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

    static getTranslation(id: number, language: Language = Language.Locale): Article | null {
        let baseArticle = this.get(id);
        if (baseArticle) {
            baseArticle = baseArticle.getTranslation(language);
        }
        return baseArticle;
    }
}

@globalStore
export class ArticleEdit extends BaseStore("articleedit", {dependencies: ["article"]}) {
    declare content: string;
    declare version: number;
    declare dateModified: number;

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
