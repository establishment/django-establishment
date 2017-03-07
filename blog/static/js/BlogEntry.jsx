import {UI} from "UI";
import {ArticleRenderer} from "ArticleRenderer";
import {BlogEntryStore} from "BlogStore";

// TODO: this should support a summary mode and a full mode
class BlogEntry extends UI.Panel {
    getBlogEntry() {
        return BlogEntryStore.get(this.blogEntryId);
    }

    render() {
        let articleRenderer = <ArticleRenderer ref="articleRenderer" article={this.getBlogEntry().getArticle()} />;
        let commentWidget;

        let discussion = this.getBlogEntry().getDiscussion();

        return [
            articleRenderer,
            commentWidget,
        ]
    }
}

export {BlogEntry};
