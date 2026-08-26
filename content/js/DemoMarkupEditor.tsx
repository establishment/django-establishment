import {UI} from "../../../stemjs/ui/UIBase";

import {Article} from "./state/Article";
import {MarkupEditor} from "./markup/MarkupEditor";


// TODO: should probably be in a modal component
export class DemoMarkupEditor extends UI.Element {
    getArticle() {
        return Article.get(this.options.articleId);
    }

    render() {
        let article = this.getArticle();
        if (article) {
            return [<MarkupEditor value={article.markup} style={{height: "100%"}} showButtons={false} />];
        }
        Article.fetchSync(this.options.articleId, () => {
            setTimeout(() => {this.redraw()}, 100);
        });
        return [];
    }
}
