import {UI, registerStyle} from "UI";
import {ArticleRenderer} from "ArticleRenderer";
import {MarkupClassMap} from "MarkupRenderer";
import {BlogArticleRendererStyle} from "./BlogStyle";


@registerStyle(BlogArticleRendererStyle)
class BlogArticleRenderer extends ArticleRenderer {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(this.styleSheet.blogArticleRenderer);
    }
}


@registerStyle(BlogArticleRendererStyle)
class BlogQuote extends UI.Primitive("div") {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.quote);
    }

    render() {
        return [
            <div style={{
                "flex-grow": "1000000",
                "min-width": "10%",
                "display": "inline-block",
            }}></div>,
            <div style={{
                "flex-grow": "1",
                "display": "inline-block",
            }}>
                {this.options.value}
            </div>
        ];
    }
}


BlogArticleRenderer.markupClassMap = new MarkupClassMap(ArticleRenderer.markupClassMap);
BlogArticleRenderer.markupClassMap.addClass("Quote", BlogQuote);


export {BlogArticleRenderer, BlogQuote};
