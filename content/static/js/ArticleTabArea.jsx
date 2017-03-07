import {UI} from "UI";
import {URLRouter} from "URLRouter";
import {RecursiveArticleRenderer} from "ArticleRenderer";

class ArticleTaskSwitcher extends UI.Switcher {
    constructor(options) {
        super(options);
        this.articleMap = new Map();
    }

    addArticleById(articleId) {
        if (!this.articleMap.get(articleId)) {
            let article = <RecursiveArticleRenderer articleId = {articleId}/>
            this.articleMap.set(articleId, article);
            this.appendChild(article);
        }
    }

    addArticle(article) {
        this.articleMap.set(article.options.articleId, article);
        this.appendChild(article);
    }

    switchToArticleId(articleId, callback) {
        let article = this.articleMap.get(articleId);
        this.switchToArticle(article, callback);
    }

    switchToArticle(article, callback) {
        let articleId = article.options.articleId;

        this.setActive(this.articleMap.get(articleId));

        if (callback) {
            callback();
        }
    }
};

class ArticleTabArea extends UI.Element {
    addArticleById(articleId, tabTitle, url) {
        this.switcher.addArticleById(articleId);
        let article = this.switcher.articleMap.get(articleId);
        this.urlArticleMap.set(url, article);
        this.createTab(article, tabTitle, url);
    }

    addArticle(article, tabTitle, url) {
        this.swithcer.addArticle(article);
        this.urlArticleMap.set(url, article);
        this.createTab(article, tabTitle, url);
    }

    switchToArticleTab(article, url) {
        this.switcher.switchToArticle(article, () => {
            URLRouter.route(url);
        });
    }

    setOptions(options) {
        super.setOptions(options);
        this.urlArticleMap = new Map();
        this.urlTabMap = new Map();
        this.welcomePage = <h3>Welcome to the "About" page. Click on any of the above tabs to find more information on the desired topic.</h3>;
        return options;
    }

    createTab(article, title, url) {
        let tabStyle = {
            display: "inline-block",
            margin: "3px"
        };
        let tab = <UI.BasicTabTitle active={false} title={title} style={tabStyle} onClick={()=> {this.switchToArticleTab(article, url);}}/>;
        this.urlTabMap.set(url, tab);
        this.tabArea.appendTab(tab);
    }

    render() {
        return [
            <UI.TabTitleArea ref="tabArea"/>,
            <ArticleTaskSwitcher ref="switcher"/>
        ];
    }

    onMount() {
        this.switcher.appendChild(this.welcomePage);
        this.switcher.setActive(this.welcomePage);

        if (this.options.articleList) {
            for (let i = 0; i < this.options.articleList.length; i += 1) {
                let element = this.options.articleList[i];
                this.addArticleById(element.articleId, element.title, element.url);
            }
        }

        let handleLocation = (location) => {
            if (!location)
                return;
            try {
                let url = location.args[0];
                let article = this.urlArticleMap.get(url);
                let tab = this.urlTabMap.get(url);
                if(article && tab) {
                    this.switchToArticleTab(article, url);
                    this.tabArea.setActiveTab(tab);
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };

        handleLocation(URLRouter.getLocation());
        URLRouter.addRouteListener(handleLocation);
    }
};

export {ArticleTabArea};