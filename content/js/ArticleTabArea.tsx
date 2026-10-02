import {UI, type ExtendedOptions, type UIElement} from "../../../stemjs/ui/UIBase";
import {Router} from "../../../stemjs/ui/Router";
import {TabArea, BasicTabTitle} from "../../../stemjs/ui/tabs/TabArea";
import {ArticleSwitcher} from "./ArticleRenderer";


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
    declare tabTitles: BasicTabTitle[];

    getDefaultOptions() {
        return {
            autoActive: false,
            path: "/",
            articles: [],
        };
    }

    getArticleUrl(articleEntry: ArticleEntry) {
        let url = this.options.path;
        if (!url.endsWith("/")) {
            url += "/";
        }
        return url + articleEntry.url + "/";
    }

    // Left open, here and in createTabTitle: an entry stands in for the panel the base's signature names,
    // as getChildrenToRender says, and BasicTabTitle's own panel option is a UIElement
    onSetActive(articleEntry) {
        this.switcherArea.setActiveArticleId(articleEntry.articleId);
        Router.changeURL(this.getArticleUrl(articleEntry));
    }

    // Not the base's: its resize handler forwards to a panel switcher, which this area does not have
    onMount() {
        this.attachListener(this.activeTabDispatcher, (articleEntry: ArticleEntry) => {
            this.onSetActive(articleEntry);
        });
    }

    getInitialPanel() {
        return <h3>Welcome to the "About" page. Click on any of the above tabs to find more information on the desired topic.</h3>;
    }

    getSwitcher(tabPanels: UIElement[]) {
        return <ArticleSwitcher ref="switcherArea" lazyRender={this.options.lazyRender}
                                style={{margin: "1em"}}>
            {this.getInitialPanel()}
        </ArticleSwitcher>;
    }

    createTabTitle(articleEntry, index: number) {
        return <BasicTabTitle ref={this.refLinkArray("tabTitles", index)} panel={articleEntry} title={articleEntry.title}
                              activeTabDispatcher={this.activeTabDispatcher}
                              href={this.getArticleUrl(articleEntry)} styleSheet={this.styleSheet}/>;
    }

    // An entry describes a tab, never a panel: the switcher loads an article by id rather than mounting one
    getChildrenToRender() {
        return [
            this.getTitleArea(this.options.articles.map((articleEntry, index) => this.createTabTitle(articleEntry, index))),
            this.getSwitcher([]),
        ];
    }

    setURL(urlParts: string[]) {
        const index = this.options.articles.findIndex(articleEntry => articleEntry.url === urlParts[0]);
        if (index !== -1) {
            this.tabTitles[index].setActive(true);
        }
    }
}

export {ArticleTabArea};
