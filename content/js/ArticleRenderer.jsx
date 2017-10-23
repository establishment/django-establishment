import {UI, SVG, Switcher, Button} from "UI";
import {MarkupRenderer, MarkupClassMap} from "MarkupRenderer";
import {Language} from "LanguageStore";

import {Article, ArticleStore} from "./state/ArticleStore";


class ArticleRenderer extends MarkupRenderer {
    getDefaultOptions() {
        return {
            classMap: this.constructor.markupClassMap,
            liveLanguage: false
        };
    }

    getEditButton() {
        if (this.options.showEditButton && this.options.article.canBeEditedByUser()) {
            let url = this.options.editButtonUrl || ("/article/" + this.options.article.id + "/edit/");
            return <div className="text-left">
                <a href={url} target="_blank">
                    <Button label={UI.T("Edit")}
                               style={{"margin": "10px"}}/></a>
            </div>;
        }
    }

    render() {
        return [
            this.getEditButton(),
            super.render()
        ];
    }

    setArticle(article) {
        this.updateOptions({ article });
    }

    getValue() {
        super.setValue(this.options.article.markup);
        return super.getValue();
    }

    redraw() {
        if (!this.options.article.dependency) {
            super.redraw();
            return;
        }

        let dependencyArray = this.options.article.dependency.split(",");
        let requireAndRedraw = (dependencies) => {
            this.registerDependencies(dependencies);
            super.redraw();
        };
        // Not using require directly to fool webpack
        window["require"](dependencyArray, function () {
            // this needs to be inside of an anonymous function to preserve arguments
            requireAndRedraw(Array.from(arguments));
        });
    }

    onMount() {
        if (this.options.liveLanguage) {
            this.attachListener(Language, "localeChange", () => {
                const baseArticle = this.options.article.getBaseArticle();
                if (baseArticle) {
                    this.setArticle(baseArticle.getTranslation());
                }
            });
        }
    }
}

class RecursiveArticleRenderer extends ArticleRenderer {
    setOptions(options) {
        super.setOptions(options);
        this.options.articleId = this.options.articleId || this.options.id;
    }

    redraw() {
        if (this.options.article) {
            return super.redraw();
        } else {
            ArticleStore.fetch(this.options.articleId, (article) => this.updateOptions({ article }));
        }
    }
}

class ArticleSwitcher extends Switcher {
    getDefaultOptions() {
        return Object.assign({}, super.getDefaultOptions(), {
            fullHeight: true,
        });
    }

    constructor() {
        super(...arguments);
        this.articleChildMap = new WeakMap();
    }

    setOptions(options) {
        options = Object.assign({
            lazyRender: true,
        }, options);
        super.setOptions(options);
    }

    getPageForArticle(article) {
        if (!this.articleChildMap.has(article)) {
            this.articleChildMap.set(article, <ArticleRenderer article={article} showEditButton={this.options.showEditButton} />);
        }
        return this.articleChildMap.get(article);
    }

    setActive(article) {
        if (!(article instanceof Article)) {
            super.setActive(article);
            return;
        }
        super.setActive(this.getPageForArticle(article));
    }

    setActiveArticleId(articleId) {
        ArticleStore.fetch(articleId, (article) => {
            this.setActive(article);
        });
    }

    onMount() {
        super.onMount();
        if (this.options.initialArticle) {
            this.setActive(this.options.initialArticle);
        }
        if (this.options.initialArticleId) {
            this.setActiveArticleId(this.options.initialArticleId);
        }
    }
}

ArticleRenderer.markupClassMap = new MarkupClassMap(MarkupClassMap.GLOBAL, [
    ["Article", RecursiveArticleRenderer],
    ["RawSVG", SVG.RawSVG]
]);

export {ArticleRenderer, RecursiveArticleRenderer, ArticleSwitcher};
