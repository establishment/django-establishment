import { Ajax } from "Ajax";
import { GlobalState } from "State";
import { UI } from "UI";
import { MarkupEditorModal } from "MarkupEditorModal";
import { LoginModal } from "LoginModal";
import { URLRouter } from "URLRouter";
import { ChatMarkupRenderer } from "ChatMarkupRenderer";
import { UserHandle } from "UserHandle";
import { EditThreadReplyButton } from "EditThreadReplyButton";
import { DeleteThreadReplyButton } from "DeleteThreadReplyButton";
import { CreateThreadReplyButton } from "CreateThreadReplyButton";
import { CommentVotingWidgetWithThumbs } from "VotingWidget";
import { ErrorHandlers } from "ErrorHandlers";
import { AjaxLoadingScreen } from "AjaxLoadingScreen";
import { ForumThreadPanelStyle } from "ForumStyle";
import { ForumThreadReplyStyle } from "ForumStyle";
import { ButtonStyle } from "ForumStyle";

var forumThreadReplyStyle = ForumThreadReplyStyle.getInstance();
var forumThreadPanelStyle = ForumThreadPanelStyle.getInstance();
var buttonStyle = ButtonStyle.getInstance();

var CreateForumThreadModal = function (_MarkupEditorModal) {
    babelHelpers.inherits(CreateForumThreadModal, _MarkupEditorModal);

    function CreateForumThreadModal() {
        babelHelpers.classCallCheck(this, CreateForumThreadModal);
        return babelHelpers.possibleConstructorReturn(this, (CreateForumThreadModal.__proto__ || Object.getPrototypeOf(CreateForumThreadModal)).apply(this, arguments));
    }

    babelHelpers.createClass(CreateForumThreadModal, [{
        key: "getGivenChildren",
        value: function getGivenChildren() {
            var inputStyle = {
                "margin-bottom": "4px",
                "border": "0",
                //"border-radius": "4px",
                //"border": "2px solid #dcdcdc",
                "outline": "none",
                "color": "#333",
                "font-size": "14px",
                "padding-left": "8px",
                "width": "100%",
                "text-align": "center",
                "font-weight": "bold"
            };

            return [UI.createElement(UI.Input, { label: UI.T("Title"), ref: "titleInput", style: inputStyle, placeholder: "Click here to edit the title (max. 160 characters)." })].concat(babelHelpers.toConsumableArray(babelHelpers.get(CreateForumThreadModal.prototype.__proto__ || Object.getPrototypeOf(CreateForumThreadModal.prototype), "getGivenChildren", this).call(this)));
        }
    }, {
        key: "onMount",
        value: function onMount() {
            var _this2 = this;

            babelHelpers.get(CreateForumThreadModal.prototype.__proto__ || Object.getPrototypeOf(CreateForumThreadModal.prototype), "onMount", this).call(this);
            this.doneButton.addClickListener(function () {
                _this2.createForumThread();
            });
        }
    }, {
        key: "createForumThread",
        value: function createForumThread() {
            var _this3 = this;

            var request = {
                forumId: this.options.forumId,
                title: this.titleInput.getValue(),
                message: this.markupEditor.getValue()
            };

            Ajax.postJSON("/forum/create_forum_thread/", request).then(function (data) {
                if (data.error) {
                    ErrorHandlers.SHOW_ERROR_ALERT(data.error);
                } else {
                    GlobalState.importState(data.state);
                    URLRouter.route(data.forumThreadId);
                    _this3.titleInput.setValue("");
                    _this3.markupEditor.setValue("");
                    _this3.markupEditor.redraw();
                }
            }, function (error) {
                console.log("Error in creating forum thread");
                console.log(error.message);
                console.log(error.stack);
            });
        }
    }]);
    return CreateForumThreadModal;
}(MarkupEditorModal);

var CreateForumThreadButton = function (_UI$Button) {
    babelHelpers.inherits(CreateForumThreadButton, _UI$Button);

    function CreateForumThreadButton() {
        babelHelpers.classCallCheck(this, CreateForumThreadButton);
        return babelHelpers.possibleConstructorReturn(this, (CreateForumThreadButton.__proto__ || Object.getPrototypeOf(CreateForumThreadButton)).apply(this, arguments));
    }

    babelHelpers.createClass(CreateForumThreadButton, [{
        key: "extraNodeAttributes",
        value: function extraNodeAttributes(attr) {
            attr.addClass(buttonStyle.button);
        }
    }, {
        key: "setOptions",
        value: function setOptions(options) {
            if (!options.faIcon) {
                options.label = options.label || UI.T("Preview");
            }
            options.level = options.level || UI.Level.PRIMARY;
            options.size = options.size || UI.Size.LARGE;
            babelHelpers.get(CreateForumThreadButton.prototype.__proto__ || Object.getPrototypeOf(CreateForumThreadButton.prototype), "setOptions", this).call(this, options);
        }
    }, {
        key: "onMount",
        value: function onMount() {
            var _this5 = this;

            babelHelpers.get(CreateForumThreadButton.prototype.__proto__ || Object.getPrototypeOf(CreateForumThreadButton.prototype), "onMount", this).call(this);
            this.addClickListener(function () {
                if (!USER.isAuthenticated) {
                    LoginModal.show();
                    return;
                }
                if (!_this5.markupEditorModal) {
                    // TODO: creating a modal should not involve explicitly calling mount
                    _this5.markupEditorModal = UI.createElement(CreateForumThreadModal, { forumId: _this5.options.forumId,
                        classMap: ChatMarkupRenderer.classMap
                    });
                    _this5.markupEditorModal.mount(document.body);
                }
                _this5.markupEditorModal.show();
            });
        }
    }]);
    return CreateForumThreadButton;
}(UI.Button);

var DeleteForumThreadModal = function (_UI$ActionModal) {
    babelHelpers.inherits(DeleteForumThreadModal, _UI$ActionModal);

    function DeleteForumThreadModal() {
        babelHelpers.classCallCheck(this, DeleteForumThreadModal);
        return babelHelpers.possibleConstructorReturn(this, (DeleteForumThreadModal.__proto__ || Object.getPrototypeOf(DeleteForumThreadModal)).apply(this, arguments));
    }

    babelHelpers.createClass(DeleteForumThreadModal, [{
        key: "getTitle",
        value: function getTitle() {
            return UI.T("Delete forum thread");
        }
    }, {
        key: "getActionName",
        value: function getActionName() {
            return UI.T("Delete");
        }
    }, {
        key: "getBody",
        value: function getBody() {
            return UI.createElement(
                "p",
                null,
                UI.T("Are you sure you want to delete thread"),
                " \"" + this.options.forumThread.title + "\"?"
            );
        }
    }, {
        key: "action",
        value: function action() {
            this.options.forumThread.deleteThread();
            this.hide();
        }
    }]);
    return DeleteForumThreadModal;
}(UI.ActionModal);

var DeleteForumThreadButton = UI.ActionModalButton(DeleteForumThreadModal);

var ForumThreadReply = function (_UI$ConstructorInitMi) {
    babelHelpers.inherits(ForumThreadReply, _UI$ConstructorInitMi);

    function ForumThreadReply() {
        babelHelpers.classCallCheck(this, ForumThreadReply);
        return babelHelpers.possibleConstructorReturn(this, (ForumThreadReply.__proto__ || Object.getPrototypeOf(ForumThreadReply)).apply(this, arguments));
    }

    babelHelpers.createClass(ForumThreadReply, [{
        key: "extraNodeAttributes",
        value: function extraNodeAttributes(attr) {
            // attr.addClass(forumThreadReplyStyle.mainClass);
        }
    }, {
        key: "getMessageInstance",
        value: function getMessageInstance() {
            return this.options.messageInstance;
        }
    }, {
        key: "render",
        value: function render() {
            var messageInstance = this.getMessageInstance();
            var deleteMessage = void 0;
            var editMessage = void 0;
            var editAndDeleteButtons = UI.createElement("span", null);

            if (USER.isSuperUser || USER.id === messageInstance.userId) {
                deleteMessage = UI.createElement(DeleteThreadReplyButton, {
                    faIcon: "trash",
                    level: UI.Level.DANGER,
                    className: forumThreadPanelStyle.deleteButton,
                    modalOptions: { messageInstance: messageInstance } });
                editMessage = UI.createElement(EditThreadReplyButton, {
                    faIcon: "pencil",
                    level: UI.Level.INFO,
                    messageInstance: messageInstance,
                    forumThreadPanel: this,
                    className: forumThreadPanelStyle.editButton });
                editAndDeleteButtons = UI.createElement(
                    "div",
                    { className: forumThreadPanelStyle.editDeleteButtons, style: { width: "auto" } },
                    editMessage,
                    deleteMessage
                );
            }

            return [UI.createElement(
                "div",
                { className: forumThreadPanelStyle.fullPost },
                UI.createElement(
                    "div",
                    { className: forumThreadPanelStyle.author,
                        style: {
                            fontSize: "1em",
                            paddingLeft: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        } },
                    UI.createElement(UserHandle, { id: messageInstance.userId, style: {
                            textTransform: "initial",
                            fontSize: "1.1em"
                        } }),
                    UI.createElement(UI.TimePassedSpan, { timeStamp: messageInstance.getDate(), style: {
                            color: "#262626 !important",
                            paddingRight: "12px"
                        } })
                ),
                UI.createElement(ChatMarkupRenderer, { ref: this.refLink("postContent" + messageInstance.id), value: messageInstance.getContent(), className: forumThreadPanelStyle.message }),
                UI.createElement(
                    "div",
                    { className: forumThreadPanelStyle.bottomPanel },
                    editAndDeleteButtons,
                    UI.createElement(CommentVotingWidgetWithThumbs, { height: 40, balanceColor: "#313534", notVoteColor: "#313534", message: messageInstance, className: forumThreadPanelStyle.voting })
                )
            )];
        }
    }, {
        key: "onMount",
        value: function onMount() {
            var _this8 = this;

            this.getMessageInstance().addEventListener("messageDelete", function () {
                _this8.hide();
            });
            this.getMessageInstance().addEventListener("messageEdit", function () {
                _this8.redraw();
            });
        }
    }]);
    return ForumThreadReply;
}(UI.ConstructorInitMixin(UI.Element));

var ForumThreadPanel = function (_UI$ConstructorInitMi2) {
    babelHelpers.inherits(ForumThreadPanel, _UI$ConstructorInitMi2);

    function ForumThreadPanel() {
        babelHelpers.classCallCheck(this, ForumThreadPanel);
        return babelHelpers.possibleConstructorReturn(this, (ForumThreadPanel.__proto__ || Object.getPrototypeOf(ForumThreadPanel)).apply(this, arguments));
    }

    babelHelpers.createClass(ForumThreadPanel, [{
        key: "getNodeAttributes",
        value: function getNodeAttributes() {
            var attr = babelHelpers.get(ForumThreadPanel.prototype.__proto__ || Object.getPrototypeOf(ForumThreadPanel.prototype), "getNodeAttributes", this).call(this);
            attr.addClass(forumThreadPanelStyle.mainClass);
            return attr;
        }
    }, {
        key: "getForumThreadState",
        value: function getForumThreadState(callback) {
            var request = {
                forumThreadId: this.options.forumThread.id
            };

            Ajax.postJSON("/forum/forum_thread_state/", request).then(function (data) {
                if (data.error) {
                    URLRouter.route();
                } else {
                    GlobalState.importState(data.state);
                    if (callback) {
                        callback();
                    }
                }
            }, function (error) {
                console.log("Error in getting forum thread:");
                console.log(error.message);
                console.log(error.stack);
            });
        }
    }, {
        key: "getForumThread",
        value: function getForumThread() {
            return this.options.forumThread;
        }
    }, {
        key: "getTitle",
        value: function getTitle() {
            return [UI.createElement(
                "div",
                { className: forumThreadPanelStyle.title },
                UI.createElement(
                    "a",
                    { href: "/forum/#", className: forumThreadPanelStyle.backButton },
                    UI.createElement("span", { className: "fa fa-arrow-left", style: {
                            paddingRight: "10px",
                            fontSize: ".8em",
                            color: "#333"
                        } })
                ),
                this.getForumThread().getTitle()
            )];
        }
    }, {
        key: "getAuthor",
        value: function getAuthor() {
            return UI.createElement(
                "div",
                { className: forumThreadPanelStyle.author },
                UI.T("written by"),
                "\xA0",
                UI.createElement(UserHandle, { id: this.getForumThread().authorId, style: {
                        textTransform: "initial"
                    } }),
                "\xA0",
                UI.createElement(UI.TimePassedSpan, { timeStamp: this.getForumThread().getTimeAdded(), style: { color: "#262626 !important" } })
            );
        }
    }, {
        key: "getMessage",
        value: function getMessage() {
            return UI.createElement(
                "div",
                { className: forumThreadPanelStyle.message },
                UI.createElement(ChatMarkupRenderer, { ref: this.refLink("content"), value: this.getForumThread().getContentMessage().getContent(), style: { height: "auto" } })
            );
        }
    }, {
        key: "getNumReplies",
        value: function getNumReplies(postsLength) {
            return [UI.createElement(
                "div",
                { className: forumThreadPanelStyle.numReplies },
                UI.createElement(
                    "span",
                    { style: { "font-weight": "bold" } },
                    postsLength
                ),
                "\xA0",
                "replies in this thread" + (postsLength == 0 ? ", be the first one to comment" : "")
            )];
        }
    }, {
        key: "getVoting",
        value: function getVoting() {
            return UI.createElement(
                "div",
                { className: forumThreadPanelStyle.voting },
                UI.createElement(CommentVotingWidgetWithThumbs, { height: 40, balanceColor: "#313534", notVoteColor: "#313534", message: this.getForumThread().getContentMessage(), style: { "margin-left": "0" } })
            );
        }
    }, {
        key: "render",
        value: function render() {
            var _this10 = this;

            if (!this.options.forumThread.isLoaded()) {
                this.getForumThreadState(function () {
                    _this10.redraw();
                    _this10.initializeListeners();
                });
                return UI.createElement(AjaxLoadingScreen, null);
            }

            var replies = [];
            var spaceBetween = void 0;
            var forumThread = this.options.forumThread;

            // sort the forum replies by the activity date
            var forumThreadMessages = Array.from(forumThread.getMessageThread().getMessages());
            forumThreadMessages.sort(function (a, b) {
                return a.getDate() - b.getDate();
            });

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = forumThreadMessages[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var messageInstance = _step.value;

                    if (messageInstance !== forumThread.getContentMessage()) {
                        replies.push(UI.createElement(ForumThreadReply, { className: forumThreadPanelStyle.replies, messageInstance: messageInstance }));
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            if (replies.length) {
                spaceBetween = UI.createElement("div", { style: {
                        height: "60px",
                        borderBottom: "1px solid #ddd",
                        width: "90%",
                        maxWidth: "1200px",
                        margin: "0 auto"
                    } });
            }

            var deleteButton = void 0;
            var editButton = void 0;
            var editAndDeleteButtons = void 0;

            if (USER.isSuperUser || USER.id === this.getForumThread().authorId) {
                deleteButton = UI.createElement(DeleteForumThreadButton, { faIcon: "trash",
                    level: UI.Level.DANGER,
                    className: forumThreadPanelStyle.deleteButton,
                    modalOptions: {
                        forumThread: this.getForumThread()
                    } });
                editButton = UI.createElement(EditThreadReplyButton, { faIcon: "pencil",
                    level: UI.Level.INFO,
                    className: forumThreadPanelStyle.editButton,
                    messageInstance: this.getForumThread().getContentMessage() });
                editAndDeleteButtons = UI.createElement(
                    "div",
                    { className: forumThreadPanelStyle.editDeleteButtons },
                    editButton,
                    deleteButton
                );
            }

            return [UI.createElement(
                "div",
                { style: { marginBottom: "60px" } },
                UI.createElement(
                    "div",
                    { className: forumThreadPanelStyle.header },
                    this.getTitle(),
                    UI.createElement(
                        "div",
                        { className: forumThreadPanelStyle.replyButtonDiv },
                        this.getAuthor(),
                        UI.createElement(CreateThreadReplyButton, {
                            label: UI.T("REPLY"),
                            className: forumThreadPanelStyle.replyButton,
                            size: UI.Size.DEFAULT,
                            forumThreadId: forumThread.id,
                            forumThread: this.getForumThread(),
                            classMap: ChatMarkupRenderer.classMap
                        })
                    )
                ),
                UI.createElement("div", { style: { width: "90%", maxWidth: "1200px", margin: "0 auto", height: "3px", backgroundColor: "#333", marginTop: "10px" } }),
                UI.createElement(
                    "div",
                    { className: forumThreadPanelStyle.fullPost },
                    this.getMessage(),
                    UI.createElement(
                        "div",
                        { className: forumThreadPanelStyle.bottomPanel },
                        this.getNumReplies(replies.length),
                        this.getVoting()
                    ),
                    editAndDeleteButtons
                ),
                spaceBetween,
                replies
            )];
        }
    }, {
        key: "deleteThread",
        value: function deleteThread() {
            this.getForumThread().deleteThread();
        }
    }, {
        key: "initializeListeners",
        value: function initializeListeners() {
            var _this11 = this;

            // These listeners need to be attached after the ForumThread is loaded in the js state
            this.getForumThread().getMessageThread().addListener("newMessage", function () {
                _this11.redraw();
            });
            this.getForumThread().getMessageThread().addListener("deleteMessage", function () {
                _this11.redraw();
            });
            this.getForumThread().getContentMessage().addEventListener("messageEdit", function () {
                _this11.content.setValue(_this11.getForumThread().getContentMessage().getContent());
                _this11.content.redraw();
            });
        }
    }, {
        key: "onMount",
        value: function onMount() {
            // This applies only for a newly created forum thread, since the listeners from
            // render do not get attached when the thread is already in the state.

            if (this.options.forumThread.isLoaded()) {
                this.initializeListeners();
            }

            this.getForumThread().addDeleteListener(function () {
                URLRouter.route();
            });
        }
    }]);
    return ForumThreadPanel;
}(UI.ConstructorInitMixin(UI.Panel));

export { CreateForumThreadButton, ForumThreadPanel };
