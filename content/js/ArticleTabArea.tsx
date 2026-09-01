import {UI, type ExtendedOptions} from "../../../stemjs/ui/UIBase";
import {Dispatchable} from "../../../stemjs/base/Dispatcher";
import {Router} from "../../../stemjs/ui/Router";
import {TabArea, BasicTabTitle} from "../../../stemjs/ui/tabs/TabArea";
import {ArticleSwitcher} from "./ArticleRenderer";


// One tab's worth of article, before setOptions folds a Dispatchable into it
export interface ArticleEntry {
    articleId: number;
    title: string;
    url: string;
}

export interface ArticleTabAreaOptions {
    path?: string;
    articles?: ArticleEntry[];
}

class ArticleTabArea extends TabArea {
    declare options: ExtendedOptions<TabArea, ArticleTabAreaOptions>;
    declare switcherArea: ArticleSwitcher;
    // A Dispatchable each, so a tab title can listen for the "show" that setURL sends its entry
    declare articleEntries: (ArticleEntry & Dispatchable)[];

    getDefaultOptions() {
        return {
            autoActive: false,
            path: "/"
        };
    }

    getArticleUrl(articleEntry) {
        let url = this.options.path;
        if (!url.endsWith("/")) {
            url += "/";
        }
        return url + articleEntry.url + "/";
    }

    onSetActive(articleEntry) {
        this.switcherArea.setActiveArticleId(articleEntry.articleId);
        Router.changeURL(this.getArticleUrl(articleEntry));
    }

    getInitialPanel() {
        return <h3>Welcome to the "About" page. Click on any of the above tabs to find more information on the desired topic.</h3>;
    }

    getSwitcher(tabPanels) {
        return <ArticleSwitcher ref="switcherArea" lazyRender={this.options.lazyRender}
                                style={{margin: "1em"}}>
            {this.getInitialPanel()}
        </ArticleSwitcher>;
    }

    createTabTitle(articleEntry) {
        return <BasicTabTitle panel={articleEntry} title={articleEntry.title}
                              activeTabDispatcher={this.activeTabDispatcher}
                              href={this.getArticleUrl(articleEntry)} styleSheet={this.styleSheet}/>;
    }

    // An entry describes a tab, never a panel: the switcher loads an article by id rather than mounting one
    getChildrenToRender() {
        return [
            this.getTitleArea(this.articleEntries.map(articleEntry => this.createTabTitle(articleEntry))),
            this.getSwitcher([]),
        ];
    }

    setOptions(options) {
        super.setOptions(options);
        this.articleEntries = (this.options.articles || []).map(
            articleEntry => Object.assign(new Dispatchable(), articleEntry)
        );
    }

    setURL(urlParts) {
        for (let articleEntry of this.articleEntries) {
            if (articleEntry.url === urlParts[0]) {
                articleEntry.dispatch("show"); // so that the tab title also known to set itself active
                return;
            }
        }
    }
}

export {ArticleTabArea};
