import {UI} from "../../../stemjs/src/ui/UIBase.js";

import {ArticleStore} from "./state/ArticleStore.js";
import {MarkupEditor} from "./markup/MarkupEditor.jsx";


// TODO: should probably be in a modal component
export class DemoMarkupEditor extends UI.Element {
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
