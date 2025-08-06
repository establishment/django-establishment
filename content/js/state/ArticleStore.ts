import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/OldStore";
import {AjaxFetchMixin} from "../../../../stemjs/src/state/StoreMixins";
import {coolStore} from "../../../../stemjs/src/state/Store";

import {User} from "../../../../csaaccounts/js/state/UserStore";
import {Language} from "../../../localization/js/state/LanguageStore.js";

@coolStore
export class Article extends AjaxFetchMixin("Article", {
    fetchURL: "/fetch_article/",
    maxFetchObjectCount: 32,
}) {
    declare userCreatedId: number;
    declare baseArticleId?: number;
    declare languageId?: number;
    declare title?: string;
    declare content?: string;
    edits: Map<number, ArticleEdit>;

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

export class ArticleEdit extends StoreObject {
    declare articleId: number;

    getArticle(): Article | null {
        return Article.get(this.articleId);
    }
}

export const ArticleStore = Article;

export const ArticleEditStore = new GenericObjectStore("articleedit", ArticleEdit, {
    dependencies: ["article"],
});

ArticleEditStore.addCreateListener((articleEdit: ArticleEdit) => {
    const article = articleEdit.getArticle();
    if (article) {
        article.addEdit(articleEdit);
    }
});
