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
    path?: any;
    // Article descriptions rather than elements, which is what setOptions turns into Dispatchables
    children?: (ArticleEntry & Dispatchable)[];
}

class ArticleTabArea extends TabArea {
    declare options: ExtendedOptions<TabArea, ArticleTabAreaOptions>;
    declare switcherArea: ArticleSwitcher;

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

    createTabPanel(articleEntry) {
        let tab = <BasicTabTitle panel={articleEntry} title={articleEntry.title}
                                 activeTabDispatcher={this.activeTabDispatcher}
                                 href={this.getArticleUrl(articleEntry)} styleSheet={this.styleSheet}/>;

        return [tab, articleEntry];
    }

    setOptions(options) {
        super.setOptions(options);
        // @ts-expect-error options.children is typed as what a caller may pass, not what is stored - Backlog item 15
        this.options.children = this.options.children.map(x => Object.assign(new Dispatchable(), x));
    }

    setURL(urlParts) {
        for (let articleEntry of this.options.children) {
            if (articleEntry.url === urlParts[0]) {
                articleEntry.dispatch("show"); // so that the tab title also known to set itself active
                return;
            }
        }
    }
}

export {ArticleTabArea};
