import {UI, SVG, Switcher, Button} from "../../../stemjs/src/ui/All.js";
import {MarkupRenderer, MarkupClassMap} from "../../../stemjs/src/markup/MarkupRenderer.js";
import {Language} from "../../localization/js/state/LanguageStore.js";
import {Article, ArticleStore} from "./state/ArticleStore";
import {ensure} from "../../../stemjs/src/base/Require.js";


class ArticleRenderer extends MarkupRenderer {
    setOptions(options) {
        options.classMap = options.classMap || this.constructor.markupClassMap;
        super.setOptions(options);
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
        super.setValue(this.getArticleToRender().markup);
        return super.getValue();
    }

    getArticleToRender() {
        return this.options.article.getTranslation();
    }

    getArticleDependencies() {
        const dependencies = this.options.article.dependency;
        return dependencies?.split(",").map(dep => dep.trim()).filter(dep => !!dep);
    }

    redraw() {
        const dependencies = this.getArticleDependencies();
        if (!dependencies || dependencies.length === 0) {
            super.redraw();
            return;
        }

        const depPaths = dependencies.map(dep => `/static/js/${dep}.js`);

        ensure(depPaths, (...args) => {
            const reqDep = dependencies.map(dep => require(dep));
            this.registerDependencies(reqDep);
            super.redraw();
        });
    }

    onMount() {
        if (this.options.liveLanguage) {
            this.attachListener(Language, "localeChange", () => this.redraw());
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
