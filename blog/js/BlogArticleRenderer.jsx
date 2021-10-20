import {UI, registerStyle} from "ui/UI";
import {MarkupClassMap} from "markup/MarkupRenderer";

import {ArticleRenderer} from "ArticleRenderer";
import {BlogArticleRendererStyle} from "./BlogStyle";

// TODO move this to the regular markup class
@registerStyle(BlogArticleRendererStyle)
class BlogArticleRenderer extends ArticleRenderer {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(this.styleSheet.blogArticleRenderer);
    }
}


@registerStyle(BlogArticleRendererStyle)
class BlogQuote extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle({
            marginTop: 20,
            marginBottom: 20
        });
    }

    render() {
        const {value, source} = this.options;
        return [
            <div className={this.styleSheet.quote}>
                <div style={{
                    "flex-grow": "1000000",
                    "min-width": "10%",
                    "display": "inline-block",
                }}></div>
                <div style={{
                    "flex-grow": "1",
                    display: "inline-block",
                }}>
                    {value}
                </div>
            </div>,
            source && <div style={{
                textAlign: "right",
            }}>
                {source}
            </div>
        ];
    }
}


MarkupClassMap.addClass("Quote", BlogQuote);


export {BlogArticleRenderer, BlogQuote};
