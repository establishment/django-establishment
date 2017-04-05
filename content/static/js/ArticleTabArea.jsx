import {UI, SVG} from "UI";
import {TabArea} from "TabArea";
import {Dispatchable} from "Dispatcher";
import {URLRouter} from "URLRouter";
import {ArticleStore} from "ArticleStore";
import {ArticleSwitcher} from "ArticleRenderer";
import {BasicTabTitle} from "TabArea";

class ArticleTabArea extends TabArea {
    onSetActive(articleEntry) {
        this.switcherArea.setActiveArticleId(articleEntry.articleId);
        URLRouter.route(articleEntry.url);
    }

    getInitialPanel() {
        return <h3>Welcome to the "About" page. Click on any of the above tabs to find more information on the desired topic.</h3>;
    }

    getSwitcher(tabPanels) {
        return <ArticleSwitcher
            ref="switcherArea" lazyRender={this.options.lazyRender}
            style={{margin: "1em"}}
        >
                {this.getInitialPanel()}
        </ArticleSwitcher>;
    }

    createTabPanel(articleEntry) {
        let href = window.location.origin + window.location.pathname + "#" + articleEntry.url;

        let tab = <BasicTabTitle panel={articleEntry}
                                 title={articleEntry.title}
                                 activeTabDispatcher={this.activeTabDispatcher}
                                 href={href} styleSet={this.getStyleSet()}/>;

        return [tab, articleEntry];
    }

    setOptions(options) {
        options = Object.assign({
            autoActive: false,
        }, options);
        super.setOptions(options);
        this.options.children = this.options.children.map(x => Object.assign(new Dispatchable(), x));
    }

    onMount() {
        super.onMount();
        let handleLocation = (location) => {
            if (!location) {
                return;
            }
            try {
                let url = location.args[0];
                for (let articleEntry of this.options.children) {
                    if (articleEntry.url === url) {
                        articleEntry.dispatch("show"); // so that the tab title also known to set itself active
                        return;
                    }
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };

        handleLocation(URLRouter.getLocation());
        URLRouter.addRouteListener(handleLocation);
    }
}

export {ArticleTabArea};
