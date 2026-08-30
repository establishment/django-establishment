import {UI, type ElementOptions} from "../../../stemjs/ui/UIBase";
import {registerStyle} from "../../../stemjs/ui/style/Theme";
import {MarkupClassMap} from "../../../stemjs/markup/MarkupRenderer";
import {ArticleRenderer} from "../../content/js/ArticleRenderer";
import {BlogArticleRendererStyle} from "./BlogStyle";

// TODO move this to the regular markup class
@registerStyle(BlogArticleRendererStyle)
export class BlogArticleRenderer extends ArticleRenderer {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(this.styleSheet.blogArticleRenderer);
    }
}


export interface BlogQuoteOptions {
    source?: any;
    value?: any;
}

@registerStyle(BlogArticleRendererStyle)
export class BlogQuote extends UI.Element {
    declare options: ElementOptions<BlogQuoteOptions>;

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
                    flexGrow: "1000000",
                    minWidth: "10%",
                    display: "inline-block",
                }}></div>
                <div style={{
                    flexGrow: "1",
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
