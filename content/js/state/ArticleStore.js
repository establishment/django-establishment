import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";
import {AjaxFetchMixin} from "StoreMixins";
import {Language} from "LanguageStore";

class Article extends StoreObject {
    constructor(obj) {
        super(obj);
        this.edits = new Map();
    }

    canBeEditedByUser(user=USER) {
        return user.isSuperUser || this.userCreatedId == user.id;
    }

    addEdit(articleEdit) {
        this.edits.set(articleEdit.id, articleEdit);
    }

    getEdits() {
        return Array.from(this.edits.values());
    }

    getTranslation(language=Language.Locale) {
        for (let article of ArticleStore.all()) {
            if (article.baseArticleId === this.id && article.languageId === language.id) {
                return article;
            }
        }
        return this;
    }

    getBaseArticle() {
        return ArticleStore.get(this.baseArticleId) || this;
    }
}

class ArticleEdit extends StoreObject {
    getArticle() {
        return ArticleStore.get(this.articleId);
    }
}

class ArticleStoreClass extends AjaxFetchMixin(GenericObjectStore) {
    getTranslation(id, language=Language.Locale) {
        let baseArticle = this.get(id);
        if (baseArticle) {
            baseArticle = baseArticle.getTranslation(language);
        }
        return baseArticle;
    }
}

var ArticleStore = new ArticleStoreClass("article", Article, {
    fetchURL: "/fetch_article/",
    maxFetchObjectCount: 32,
});

var ArticleEditStore = new GenericObjectStore("articleedit", ArticleEdit, {
    dependencies: ["article"],
});

ArticleEditStore.addCreateListener((articleEdit) => {
    let article = articleEdit.getArticle();
    article.addEdit(articleEdit);
});

export {Article, ArticleStore, ArticleEditStore};
