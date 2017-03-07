define(["exports", "GlobalState", "MessageThreadStore", "UserStore"], function (exports, _GlobalState, _MessageThreadStore, _UserStore) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.ForumThreadStore = exports.ForumStore = undefined;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var Forum = function (_StoreObject) {
        _inherits(Forum, _StoreObject);

        function Forum(obj) {
            _classCallCheck(this, Forum);

            var _this = _possibleConstructorReturn(this, (Forum.__proto__ || Object.getPrototypeOf(Forum)).call(this, obj));

            _this.forumThreads = new Map();
            _GlobalState.GlobalState.registerStream("forum-" + _this.id);
            ForumThreadStore.addDeleteListener(function (forumThread) {
                if (forumThread.parentId === _this.id && _this.forumThreads.has(forumThread.id)) {
                    _this.deleteForumThread(forumThread);
                }
            });
            return _this;
        }

        _createClass(Forum, [{
            key: "getForumThreads",
            value: function getForumThreads() {
                var forumThreads = Array.from(this.forumThreads.values());
                // Filter out hidden forum threads
                forumThreads = forumThreads.filter(function (forumThread) {
                    return forumThread.isVisible();
                });
                forumThreads.sort(function (a, b) {
                    return b.id - a.id;
                });
                return forumThreads;
            }
        }, {
            key: "addForumThread",
            value: function addForumThread(forumThread, event) {
                this.forumThreads.set(forumThread.id, forumThread);
                this.dispatch("newForumThread", event);
            }
        }, {
            key: "deleteForumThread",
            value: function deleteForumThread(forumThread) {
                this.forumThreads.delete(forumThread.id);
                this.dispatch("deleteForumThread", forumThread);
            }
        }]);

        return Forum;
    }(_GlobalState.StoreObject);

    var ForumStore = new _GlobalState.GenericObjectStore("forum", Forum);

    var ForumThread = function (_StoreObject2) {
        _inherits(ForumThread, _StoreObject2);

        function ForumThread(obj) {
            _classCallCheck(this, ForumThread);

            var _this2 = _possibleConstructorReturn(this, (ForumThread.__proto__ || Object.getPrototypeOf(ForumThread)).call(this, obj));

            var parent = _this2.getParent();
            parent.addForumThread(_this2);
            return _this2;
        }

        _createClass(ForumThread, [{
            key: "getAuthor",
            value: function getAuthor() {
                return _UserStore.PublicUserStore.get(this.authorId);
            }
        }, {
            key: "isPinned",
            value: function isPinned() {
                return this.pinnedIndex != null;
            }
        }, {
            key: "getPinIndex",
            value: function getPinIndex() {
                return this.pinnedIndex;
            }
        }, {
            key: "getTitle",
            value: function getTitle() {
                return this.title;
            }
        }, {
            key: "getContentMessage",
            value: function getContentMessage() {
                return _MessageThreadStore.MessageInstanceStore.get(this.contentMessageId);
            }
        }, {
            key: "getVotesBalance",
            value: function getVotesBalance() {
                var message = this.getContentMessage();
                if (message) {
                    return message.getVotesBalance();
                }
                return this.votesBalance;
            }
        }, {
            key: "getParent",
            value: function getParent() {
                return ForumStore.get(this.parentId);
            }
        }, {
            key: "getMessageThread",
            value: function getMessageThread() {
                return _MessageThreadStore.MessageThreadStore.get(this.messageThreadId);
            }
        }, {
            key: "getTimeAdded",
            value: function getTimeAdded() {
                // TODO: maybe return formatted time
                return this.timeAdded;
            }
        }, {
            key: "getNumReplies",
            value: function getNumReplies() {
                return this.getNumMessages() - 1;
            }
        }, {
            key: "deleteThread",
            value: function deleteThread(onSuccess, onError) {
                var request = {
                    csrfmiddlewaretoken: CSRF_TOKEN,
                    forumThreadId: this.id,
                    hidden: true
                };

                $.ajax({
                    url: "/forum/edit_forum_thread/",
                    type: "POST",
                    dataType: "json",
                    data: request,
                    success: function success(data) {
                        if (onSuccess) {
                            onSuccess(data);
                        }
                    },
                    error: function error(xhr, errmsg, err) {
                        console.log("Error in sending delete message:\n" + xhr.status + ":\n" + xhr.responseText);
                        if (onError) {
                            onError(xhr, errmsg, err);
                        }
                    }
                });
            }
        }, {
            key: "getNumMessages",
            value: function getNumMessages() {
                var messageThreadNumMessages = void 0;
                if (this.getMessageThread()) {
                    messageThreadNumMessages = this.getMessageThread().getNumMessages();
                }
                return messageThreadNumMessages || this.numMessages;
            }
        }, {
            key: "isVisible",
            value: function isVisible() {
                return !this.hidden;
            }
        }, {
            key: "isLoaded",
            value: function isLoaded() {
                return this.getMessageThread() != null;
            }
        }]);

        return ForumThread;
    }(_GlobalState.StoreObject);

    var ForumThreadStore = new _GlobalState.GenericObjectStore("forumthread", ForumThread, {
        dependencies: ["forum", "messageinstance"]
    });

    ForumThreadStore.addCreateListener(function (forumThread, createEvent) {
        forumThread.getParent().addForumThread(forumThread, createEvent);
    });

    exports.ForumStore = ForumStore;
    exports.ForumThreadStore = ForumThreadStore;
});
