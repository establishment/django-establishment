import {UI} from "UI";
import {ArticleStore} from "ArticleStore";
import {MarkupEditor} from "MarkupEditor";

// TODO: should probably be in a modal component
class DemoMarkupEditor extends UI.Element {
    getArticle() {
        return ArticleStore.get(this.options.articleId);
    }

    render() {
        let article = this.getArticle();
        if (article) {
            return [<MarkupEditor value={article.markup} style={{height: "100%"}} showButtons={false} />];
        }
        ArticleStore.fetch(this.options.articleId, () => {
            setTimeout(() => {this.redraw()}, 100);
        });
        return [];
    }
}

function registerMarkup(markupClassMap) {
    markupClassMap.addClass("DemoMarkupEditor", DemoMarkupEditor);
}

export {DemoMarkupEditor, registerMarkup};
