import {UI} from "UI";
import {ArticleRenderer} from "ArticleRenderer";
import {BlogArticleRendererStyle} from "./BlogStyle";


let blogArticleRendererStyle = BlogArticleRendererStyle.getInstance();


class BlogArticleRenderer extends ArticleRenderer {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(blogArticleRendererStyle.blogArticleRenderer);

        return attr;
    }
}


class BlogQuote extends UI.Primitive("div") {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(blogArticleRendererStyle.quote);

        return attr;
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


BlogArticleRenderer.markupClassMap = new UI.MarkupClassMap(ArticleRenderer.markupClassMap);
BlogArticleRenderer.markupClassMap.addClass("Quote", BlogQuote);


export {BlogArticleRenderer, BlogQuote};
