import {UI, SVG, Router, TabArea, BasicTabTitle} from "UI";
import {Dispatchable} from "Dispatcher";

import {ArticleSwitcher} from "./ArticleRenderer";


class ArticleTabArea extends TabArea {
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
