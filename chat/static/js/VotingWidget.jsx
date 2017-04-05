import {UI} from "UI";
import {css, hover, focus, active, ExclusiveClassSet, StyleSet} from "Style";
import {LoginModal} from "LoginModal";
import {UserReactionCollection} from "UserReactionStore";

const VoteStatus = {
    DISLIKE: 0,
    LIKE: 1,
};

class VotingWidget extends UI.Element {
    setOptions(options) {
        options = Object.assign({
            votesBalance: 0,
            userVote: UI.VoteStatus.NONE,
            size: 1,
            likeColor: this.options.likeColor || "#1E8921", //            |
            dislikeColor: this.options.dislikeColor || "#C5302C", //      |- Triadic colors + Shades
            notVoteColor: this.options.notVoteColor || "#313534",
            balanceColor: this.options.balanceColor || "#313534",
            orientation: UI.Orientation.VERTICAL,
        }, options);
        super.setOptions(options);
    }

    extraNodeAttributes(attr) {
        attr.setStyle({
            textAlign: "center",
            marginRight: "10px",
        });
    }

    render() {
        let buttonsStyle = {
            paddingLeft: "4px",
            paddingRight: "4px",
            paddingTop: "0px",
            paddingBottom: "0px",
            lineHeight: "0px",
            backgroundColor: "transparent",
            borderColor: "transparent",
            fontSize: 40 * this.options.size + "px",
            marginTop: 8 * this.options.size + "px",
            marginBottom: 8 * this.options.size + "px",
            display: this.options.orientation === UI.Orientation.VERTICAL ? "block" : "inline-block",
            marginLeft: "auto",
            marginRight: "auto",
            opacity: 0.7,
            cursor: "pointer",
            color: this.options.notVoteColor,
        };

        let likeButtonStyle = Object.assign({}, buttonsStyle);
        if (this.getUserVote() === VoteStatus.LIKE) {
            likeButtonStyle.color = this.options.likeColor;
        }

        let dislikeButtonStyle = Object.assign({}, buttonsStyle);
        if (this.getUserVote() === VoteStatus.DISLIKE) {
            dislikeButtonStyle.color = this.options.dislikeColor;
        }

        let counterStyle = {
            fontSize: 18 * this.options.size + "px",
            fontWeight: "900",
            "color": this.options.balanceColor,
        };

        return [
            <span className="fa fa-caret-up voteButton" ref="likeButton"
                       faIcon="caret-up" style={likeButtonStyle} HTMLtitle="Click to like"/>,
            <span ref="counterContainer" style={counterStyle}>
                <UI.TextElement ref="counter" value={this.getVotesBalance() + ""}/>
            </span>,
            <span className="fa fa-caret-down voteButton" ref="dislikeButton"
                       faIcon="caret-down" style={dislikeButtonStyle} HTMLtitle="Click to dislike"/>,
            // <UI.StyleElement>
            //      <UI.StyleInstance selector=".voteButton:hover" attributes={{"opacity": "1 !important"}} />
            // </UI.StyleElement>
        ];
    }

    getVotesBalance() {
        return this.options.votesBalance;
    }

    getUserVote() {
        return this.options.userVote;
    }
}

class CommentVotingWidget extends VotingWidget {
    getVotesBalance() {
        return this.options.message.getVotesBalance();
    }

    getUserVote() {
        return this.options.message.getUserVote();
    }

    setOptions(options) {
        super.setOptions(options);
        this.updateTarget(this.options.message);
    }

    updateTarget(target) {
        if (!target || target instanceof UserReactionCollection) {
            this.options.target = target;
            return;
        }
        const possibleTarget = target.getReactionCollection();
        if (possibleTarget) {
            this.options.target = possibleTarget;
            return;
        }
        let tempListener = this.attachEventListener(target, "createReactionCollection", () => {
            this.updateOptions({target: target.getReactionCollection()});
            this.setupListener();
            tempListener.remove();
        });
    }

    setupListener() {
        let target = this.options.target;
        if (target) {
            this.attachUpdateListener(target, () => {
                this.redraw();
            })
        }
    }


    onMount() {
        this.setupListener();
        this.likeButton.addClickListener(() => {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            if (this.getUserVote() === VoteStatus.LIKE) {
                this.options.message.resetReaction();
            } else {
                this.options.message.like();
            }
        });
        this.dislikeButton.addClickListener(() => {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            if (this.getUserVote() === VoteStatus.DISLIKE) {
                this.options.message.resetReaction();
            } else {
                this.options.message.dislike();
            }
        });

        this.options.message.addListener("reaction", () => {
            this.redraw();
        });
    }
}

// TODO: rewrite
class CommentVotingWidgetWithThumbs extends UI.ConstructorInitMixin(CommentVotingWidget) {
    extraNodeAttributes(attr) {
        attr.setStyle({
            "height": "40px",
            "line-height": "40px",
            "font-size": "14px",
            "color": "#767676",
            "display": "inline-block",
            "float": "right",
            "text-align": "right",
        });
    }
    
    getNumLikes() {
        return this.options.message.getNumLikes();
    }

    getNumDislikes() {
        return this.options.message.getNumDislikes();
    }

    initCSS() {
        let style = this.css = new StyleSet();

        style.mainClass = {
            "height": "40px",
            "line-height": "40px",
            "font-size": "14px",
            "color": "#767676",
            "display": "inline-block",
            "float": "right",
            "text-align": "right",
        };

        style.thumbsStyle = {
            "font-size": this.options.height / 2 + "px", // height / 2
            "line-height": this.options.height + "px",
        };

        style.displayStyle = css({
            "display": "inline-block",
            "float": "left",
            "padding-left": "3px",
        });

        style.counterStyle = {
            "font-size": 18 * this.options.size + "px",
            "font-weight": "900",
            "color": this.options.balanceColor,
        };

        style.thumbsUpHoverStyle = style.css({
                "transition": ".25s",
            },
            hover({
                "color": this.options.likeColor,
                "opacity": ".8",
                "transition": ".25s",
            })
        );

        style.thumbsDownHoverStyle = style.css({
                "transition": ".25s",
            },
            hover({
                "color": this.options.dislikeColor,
                "opacity": ".8",
                "transition": ".25s",
            })
        );

        style.padding = style.css({
            "width": "3px",
            "float": "left",
            "display": "inline-block",
            "height": this.options.height + "px",
        });
    }

    render() {
        let thumbsUpScoreStyle = {};
        let thumbsDownScoreStyle = {};

        // TODO: remove duplicate code
        let likeButtonStyle = Object.assign({}, this.css.thumbsStyle);
        if (this.getUserVote() === VoteStatus.LIKE) {
            likeButtonStyle.color = thumbsUpScoreStyle.color = this.options.likeColor;
            thumbsUpScoreStyle.fontWeight = "bold";
        }

        let dislikeButtonStyle = Object.assign({}, this.css.thumbsStyle);
        if (this.getUserVote() === VoteStatus.DISLIKE) {
            dislikeButtonStyle.color = thumbsDownScoreStyle.color = this.options.dislikeColor;
            thumbsDownScoreStyle.fontWeight = "bold";
        }

        return [
            <span className={this.css.displayStyle} style={thumbsUpScoreStyle}>{this.getNumLikes()}</span>,
            <span className={"fa fa-thumbs-up voteButton " + this.css.displayStyle + " " + this.css.thumbsUpHoverStyle} ref="likeButton" faIcon="thumbs-up" style={likeButtonStyle} HTMLtitle="Click to like"/>,
            <div className={this.css.padding} />,
            <span className={this.css.displayStyle} style={thumbsDownScoreStyle}>{this.getNumDislikes()}</span>,
            <span className={"fa fa-thumbs-down voteButton " + this.css.displayStyle + " " + this.css.thumbsDownHoverStyle} ref="dislikeButton" faIcon="thumbs-down" style={dislikeButtonStyle} HTMLtitle="Click to dislike"/>,
        ];
    }

    createNode() {
        this.initCSS();
        return super.createNode();
    }
}

export {VotingWidget, CommentVotingWidget, CommentVotingWidgetWithThumbs};