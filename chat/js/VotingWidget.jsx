import {UI, registerStyle} from "UI";
import {LoginModal} from "LoginModal";
import {UserReactionCollection} from "UserReactionStore";
import {Orientation, VoteStatus} from "ui/Constants";
import {VotingWidgetStyle} from "./VotingWidgetStyle";

class VotingWidget extends UI.Element {
    setOptions(options) {
        options = Object.assign({
            votesBalance: 0,
            userVote: VoteStatus.NONE,
            size: 1,
            likeColor: this.options.likeColor || "#1E8921", //            |
            dislikeColor: this.options.dislikeColor || "#C5302C", //      |- Triadic colors + Shades
            notVoteColor: this.options.notVoteColor || "#313534",
            balanceColor: this.options.balanceColor || "#313534",
            orientation: Orientation.VERTICAL,
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
            display: this.options.orientation === Orientation.VERTICAL ? "block" : "inline-block",
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
@registerStyle(VotingWidgetStyle)
class CommentVotingWidgetWithThumbs extends CommentVotingWidget {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.container);
    }

    getNumLikes() {
        return this.options.message.getNumLikes();
    }

    getNumDislikes() {
        return this.options.message.getNumDislikes();
    }

    render() {
        let thumbsUpScoreStyle = {};
        let thumbsDownScoreStyle = {};

        // TODO: remove duplicate code
        let likeButtonStyle = Object.assign({}, this.styleSheet.thumbsStyle);
        if (this.getUserVote() === VoteStatus.LIKE) {
            likeButtonStyle.color = thumbsUpScoreStyle.color = this.options.likeColor;
            thumbsUpScoreStyle.fontWeight = "bold";
        }

        let dislikeButtonStyle = Object.assign({}, this.styleSheet.thumbsStyle);
        if (this.getUserVote() === VoteStatus.DISLIKE) {
            dislikeButtonStyle.color = thumbsDownScoreStyle.color = this.options.dislikeColor;
            thumbsDownScoreStyle.fontWeight = "bold";
        }

        return [
            <span className={this.styleSheet.displayStyle} style={thumbsUpScoreStyle}>{this.getNumLikes()}</span>,
            <span className={"fa fa-thumbs-up voteButton " + this.styleSheet.displayStyle + " " + this.styleSheet.thumbsUpHoverStyle} ref="likeButton" faIcon="thumbs-up" style={likeButtonStyle} HTMLtitle="Click to like"/>,
            <div className={this.styleSheet.padding} />,
            <span className={this.styleSheet.displayStyle} style={thumbsDownScoreStyle}>{this.getNumDislikes()}</span>,
            <span className={"fa fa-thumbs-down voteButton " + this.styleSheet.displayStyle + " " + this.styleSheet.thumbsDownHoverStyle} ref="dislikeButton" faIcon="thumbs-down" style={dislikeButtonStyle} HTMLtitle="Click to dislike"/>,
        ];
    }
}

export {VotingWidget, CommentVotingWidget, CommentVotingWidgetWithThumbs};