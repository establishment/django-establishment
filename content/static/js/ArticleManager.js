import { UI, Panel, Modal, ActionModal, SortableTable } from "UI";
import { GlobalState } from "State";
import { Ajax } from "Ajax";
import { StemDate } from "Time";
import { ArticleStore } from "ArticleStore";
import { PublicUserStore } from "UserStore";
import { Language } from "LanguageStore";
import { UserHandle } from "UserHandle";

var TransferOwnershipModal = function (_ActionModal) {
    babelHelpers.inherits(TransferOwnershipModal, _ActionModal);

    function TransferOwnershipModal() {
        babelHelpers.classCallCheck(this, TransferOwnershipModal);
        return babelHelpers.possibleConstructorReturn(this, (TransferOwnershipModal.__proto__ || Object.getPrototypeOf(TransferOwnershipModal)).apply(this, arguments));
    }

    babelHelpers.createClass(TransferOwnershipModal, [{
        key: "getActionName",
        value: function getActionName() {
            return "Transfer ownership";
        }
    }, {
        key: "getActionLevel",
        value: function getActionLevel() {
            return UI.Level.PRIMARY;
        }
    }, {
        key: "getBody",
        value: function getBody() {
            return [UI.createElement(UI.TextElement, { ref: "text", value: "Set owner" }), UI.createElement(
                UI.Form,
                { style: { marginTop: "10px" } },
                UI.createElement(
                    UI.FormField,
                    { ref: "ownerFormField", label: "Author ID" },
                    UI.createElement(UI.TextInput, { ref: "ownerFormInput", value: "" })
                )
            )];
        }
    }, {
        key: "getFooter",
        value: function getFooter() {
            var _this2 = this;

            return [UI.createElement(UI.TemporaryMessageArea, { ref: "messageArea" }), UI.createElement(
                UI.ButtonGroup,
                null,
                UI.createElement(UI.Button, { label: "Close", onClick: function onClick() {
                        return _this2.hide();
                    } }),
                UI.createElement(UI.AjaxButton, { ref: "transferOwnershipButton", level: this.getActionLevel(), onClick: function onClick() {
                        _this2.action();
                    },
                    statusOptions: [this.getActionName(), { faIcon: "spinner fa-spin", label: " transfering ownership ..." }, this.getActionName(), "Failed"] })
            )];
        }
    }, {
        key: "setArticle",
        value: function setArticle(article) {
            this.article = article;
            this.text.setValue("Set owner for " + this.article.name + ":");
            this.ownerFormInput.setValue(this.article.userCreatedId);
        }
    }, {
        key: "action",
        value: function action() {
            var _this3 = this;

            var table = this.options.parent.table;
            var newOwner = this.ownerFormInput.getValue();
            var request = {
                newOwner: newOwner
            };

            this.messageArea.showMessage("Saving...", "black", null);

            this.transferOwnershipButton.ajaxCall({
                url: "/article/" + this.article.id + "/set_owner/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    if (data.error) {
                        console.log(data.error);
                        _this3.messageArea.showMessage(data.error, "red");
                    } else {
                        console.log("Successfully changed owner", data);
                        _this3.messageArea.showMessage("Author successfully changed");
                        GlobalState.importState(data.state);
                        console.log(data.state);
                        table.redraw();
                        _this3.hide();
                    }
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in changing owner:\n" + xhr.status + ":\n" + xhr.responseText);
                    _this3.messageArea.showMessage("Error in changing owner", "red");
                }
            });
        }
    }, {
        key: "hide",
        value: function hide() {
            this.messageArea.clear();
            babelHelpers.get(TransferOwnershipModal.prototype.__proto__ || Object.getPrototypeOf(TransferOwnershipModal.prototype), "hide", this).call(this);
        }
    }]);
    return TransferOwnershipModal;
}(ActionModal);

var DeleteArticleModal = function (_ActionModal2) {
    babelHelpers.inherits(DeleteArticleModal, _ActionModal2);

    function DeleteArticleModal() {
        babelHelpers.classCallCheck(this, DeleteArticleModal);
        return babelHelpers.possibleConstructorReturn(this, (DeleteArticleModal.__proto__ || Object.getPrototypeOf(DeleteArticleModal)).apply(this, arguments));
    }

    babelHelpers.createClass(DeleteArticleModal, [{
        key: "getActionName",
        value: function getActionName() {
            return "Delete article";
        }
    }, {
        key: "getBody",
        value: function getBody() {
            return UI.createElement(UI.TextElement, { ref: "text", value: "Delete article?" });
        }
    }, {
        key: "getFooter",
        value: function getFooter() {
            var _this5 = this;

            return [UI.createElement(UI.TemporaryMessageArea, { ref: "messageArea" }), UI.createElement(
                UI.ButtonGroup,
                null,
                UI.createElement(UI.Button, { label: "Close", onClick: function onClick() {
                        return _this5.hide();
                    } }),
                UI.createElement(UI.AjaxButton, { ref: "deleteArticleButton", level: UI.Level.DANGER, onClick: function onClick() {
                        _this5.deleteArticle();
                    },
                    statusOptions: ["Delete article", { faIcon: "spinner fa-spin", label: " deleting article ..." }, "Delete article", "Failed"] })
            )];
        }
    }, {
        key: "setArticle",
        value: function setArticle(article) {
            this.article = article;
            this.text.setValue("Delete " + this.article.name + "?");
        }
    }, {
        key: "deleteArticle",
        value: function deleteArticle() {
            var _this6 = this;

            var table = this.options.parent.table;
            var request = {};
            this.deleteArticleButton.ajaxCall({
                url: "/article/" + this.article.id + "/delete/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    if (data.error) {
                        _this6.messageArea.showMessage(data.error, "red");
                        console.log(data.error);
                    } else {
                        console.log("Successfully deleted article", data);
                        table.options.articles.splice(table.getArticleIndex(_this6.article.id), 1);
                        table.redraw();
                        _this6.hide();
                    }
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in deleting article:\n" + xhr.status + ":\n" + xhr.responseText);
                }
            });
        }
    }, {
        key: "hide",
        value: function hide() {
            this.messageArea.clear();
            babelHelpers.get(DeleteArticleModal.prototype.__proto__ || Object.getPrototypeOf(DeleteArticleModal.prototype), "hide", this).call(this);
        }
    }]);
    return DeleteArticleModal;
}(ActionModal);

var CreateArticleModal = function (_ActionModal3) {
    babelHelpers.inherits(CreateArticleModal, _ActionModal3);

    function CreateArticleModal() {
        babelHelpers.classCallCheck(this, CreateArticleModal);
        return babelHelpers.possibleConstructorReturn(this, (CreateArticleModal.__proto__ || Object.getPrototypeOf(CreateArticleModal)).apply(this, arguments));
    }

    babelHelpers.createClass(CreateArticleModal, [{
        key: "getActionName",
        value: function getActionName() {
            return "Create article";
        }
    }, {
        key: "getBody",
        value: function getBody() {
            return UI.createElement(
                UI.Form,
                { style: { marginTop: "10px" } },
                UI.createElement(
                    UI.FormField,
                    { ref: "articleNameFormField", label: "Article name" },
                    UI.createElement(UI.TextInput, { ref: "articleNameInput", value: "" })
                ),
                UI.createElement(
                    UI.FormField,
                    { ref: "dependencyFormField", label: "Dependencies" },
                    UI.createElement(UI.TextInput, { ref: "dependencyInput", value: "" })
                ),
                UI.createElement(
                    UI.FormField,
                    { ref: "languageFormField", label: "Language" },
                    UI.createElement(UI.Select, { ref: "languageSelect", options: Language.all() })
                ),
                UI.createElement(
                    UI.FormField,
                    { ref: "publicFormField", label: "Public" },
                    UI.createElement(UI.CheckboxInput, { ref: "publicCheckbox", checked: false })
                )
            );
        }
    }, {
        key: "getFooter",
        value: function getFooter() {
            var _this8 = this;

            return [UI.createElement(UI.TemporaryMessageArea, { ref: "messageArea" }), UI.createElement(
                UI.ButtonGroup,
                null,
                UI.createElement(UI.Button, { label: "Close", onClick: function onClick() {
                        return _this8.hide();
                    } }),
                UI.createElement(UI.AjaxButton, { ref: "createArticleButton", level: UI.Level.PRIMARY, onClick: function onClick() {
                        _this8.createArticle();
                    },
                    statusOptions: ["Create article", { faIcon: "spinner fa-spin", label: " creating article ..." }, "Create article", "Failed"] })
            )];
        }
    }, {
        key: "createArticle",
        value: function createArticle(options) {
            var _this9 = this;

            var name = this.articleNameInput.getValue();
            var dependency = this.dependencyInput.getValue();
            var languageId = this.languageSelect.get().id;
            var isPublic = this.publicCheckbox.getValue();
            var request = {
                name: name,
                dependency: dependency,
                languageId: languageId,
                isPublic: isPublic
            };
            if (options) {
                Object.assign(request, options);
            }
            this.createArticleButton.ajaxCall({
                url: "/create_article/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    if (data.error) {
                        console.log(data.error);
                        _this9.messageArea.showMessage(data.error, "red");
                    } else {
                        console.log("Successfully created article", data);
                        GlobalState.importState(data.state);
                        _this9.options.parent.table.addArticle(ArticleStore.get(data.article.id));
                        _this9.hide();
                    }
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in creating article:\n" + xhr.status + ":\n" + xhr.responseText);
                }
            });
        }
    }, {
        key: "hide",
        value: function hide() {
            this.messageArea.clear();
            babelHelpers.get(CreateArticleModal.prototype.__proto__ || Object.getPrototypeOf(CreateArticleModal.prototype), "hide", this).call(this);
        }
    }]);
    return CreateArticleModal;
}(ActionModal);

var AddTranslationModal = function (_CreateArticleModal) {
    babelHelpers.inherits(AddTranslationModal, _CreateArticleModal);

    function AddTranslationModal() {
        babelHelpers.classCallCheck(this, AddTranslationModal);
        return babelHelpers.possibleConstructorReturn(this, (AddTranslationModal.__proto__ || Object.getPrototypeOf(AddTranslationModal)).apply(this, arguments));
    }

    babelHelpers.createClass(AddTranslationModal, [{
        key: "getActioName",
        value: function getActioName() {
            return "Add translation";
        }
    }, {
        key: "getBody",
        value: function getBody() {
            var baseArticle = this.options.baseArticle;
            return UI.createElement(
                UI.Form,
                { style: { marginTop: "10px" } },
                UI.createElement(
                    UI.FormField,
                    { ref: "articleNameFormField", label: "Article name" },
                    UI.createElement(UI.TextInput, { ref: "articleNameInput", value: "Translation for " + baseArticle.name })
                ),
                UI.createElement(
                    UI.FormField,
                    { ref: "dependencyFormField", label: "Dependencies" },
                    UI.createElement(UI.TextInput, { ref: "dependencyInput", value: baseArticle.dependency })
                ),
                UI.createElement(
                    UI.FormField,
                    { ref: "languageFormField", label: "Language" },
                    UI.createElement(UI.Select, { ref: "languageSelect", options: Language.all() })
                ),
                UI.createElement(
                    UI.FormField,
                    { ref: "publicFormField", label: "Public" },
                    UI.createElement(UI.CheckboxInput, { ref: "publicCheckbox", checked: baseArticle.isPublic })
                )
            );
        }
    }, {
        key: "getFooter",
        value: function getFooter() {
            var _this11 = this;

            var baseArticle = this.options.baseArticle;
            return [UI.createElement(UI.TemporaryMessageArea, { ref: "messageArea" }), UI.createElement(
                UI.ButtonGroup,
                null,
                UI.createElement(UI.Button, { label: "Close", onClick: function onClick() {
                        return _this11.hide();
                    } }),
                UI.createElement(UI.AjaxButton, { ref: "createArticleButton", level: UI.Level.PRIMARY,
                    onClick: function onClick() {
                        return _this11.createArticle({
                            baseArticleId: baseArticle.id,
                            markup: baseArticle.markup
                        });
                    },
                    statusOptions: ["Add translation", { faIcon: "spinner fa-spin", label: " creating translation article ..." }, "Success", "Failed"] })
            )];
        }
    }]);
    return AddTranslationModal;
}(CreateArticleModal);

var ArticleTable = function (_SortableTable) {
    babelHelpers.inherits(ArticleTable, _SortableTable);

    function ArticleTable() {
        babelHelpers.classCallCheck(this, ArticleTable);
        return babelHelpers.possibleConstructorReturn(this, (ArticleTable.__proto__ || Object.getPrototypeOf(ArticleTable)).apply(this, arguments));
    }

    babelHelpers.createClass(ArticleTable, [{
        key: "setOptions",
        value: function setOptions(options) {
            babelHelpers.get(ArticleTable.prototype.__proto__ || Object.getPrototypeOf(ArticleTable.prototype), "setOptions", this).call(this, options);
            this.resetColumnSortingOrder();
        }
    }, {
        key: "resetColumnSortingOrder",
        value: function resetColumnSortingOrder() {
            this.columnSortingOrder = [this.columns[4], this.columns[5], this.columns[0], this.columns[3], this.columns[2], this.columns[1]];
        }
    }, {
        key: "getArticleIndex",
        value: function getArticleIndex(articleId) {
            for (var i = 0; i < this.options.articles.length; i += 1) {
                if (this.options.articles[i].id === articleId) return i;
            }
            return -1;
        }
    }, {
        key: "addArticle",
        value: function addArticle(article) {
            this.options.articles.push(article);
            this.redraw();
        }
    }, {
        key: "setColumns",
        value: function setColumns() {
            var _this13 = this;

            var cellStyle = {
                textAlign: "left",
                verticalAlign: "middle"
            };
            var headerStyle = {
                textAlign: "left",
                verticalAlign: "middle"
            };
            var columns = [{
                value: function value(article) {
                    return UI.createElement(
                        "a",
                        { href: "/article/" + article.id + "/edit/" },
                        article.name
                    );
                },
                rawValue: function rawValue(article) {
                    return article.name;
                },
                headerName: "Article",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            }, {
                value: function value(article) {
                    return UI.createElement(UserHandle, { id: article.userCreatedId });
                },
                rawValue: function rawValue(article) {
                    return PublicUserStore.get(article.userCreatedId).username;
                },
                headerName: "Author",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            }, {
                value: function value(article) {
                    return article.isPublic ? UI.createElement("span", { className: "fa fa-check fa-lg", style: { color: "green" } }) : UI.createElement("span", { className: "fa fa-times fa-lg", style: { color: "red" } });
                },
                rawValue: function rawValue(article) {
                    return article.isPublic ? "Yes" : "No";
                },
                headerName: "Public",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            }, {
                value: function value(article) {
                    return Language.get(article.languageId).name;
                },
                rawValue: function rawValue(article) {
                    return Language.get(article.languageId).name;
                },
                headerName: "Language",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            }, {
                value: function value(article) {
                    return StemDate.unix(article.dateCreated).locale("en").format("DD/MM/YYYY HH:mm:ss");
                },
                rawValue: function rawValue(article) {
                    return article.dateCreated;
                },
                sortDescending: true,
                headerName: "Date created",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            }, {
                value: function value(article) {
                    return StemDate.unix(article.dateModified).locale("en").format("DD/MM/YYYY HH:mm:ss");
                },
                rawValue: function rawValue(article) {
                    return article.dateModified;
                },
                sortDescending: true,
                headerName: "Date modified",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            }];
            if (!this.options.parent.options.readOnly) {
                if (USER.isSuperUser) {
                    columns.push({
                        value: function value(article) {
                            return UI.createElement(UI.Button, { level: UI.Level.PRIMARY, label: "Set owner",
                                onClick: function onClick() {
                                    _this13.options.parent.transferOwnershipModal.show();
                                    _this13.options.parent.transferOwnershipModal.setArticle(article);
                                } });
                        },
                        headerName: "Set owner",
                        headerStyle: headerStyle,
                        cellStyle: cellStyle
                    });
                }
                columns.push({
                    value: function value(article) {
                        return UI.createElement(UI.Button, { level: UI.Level.DANGER, label: "Delete",
                            onClick: function onClick() {
                                _this13.options.parent.deleteArticleModal.show();
                                _this13.options.parent.deleteArticleModal.setArticle(article);
                            } });
                    },
                    headerName: "Delete",
                    headerStyle: headerStyle,
                    cellStyle: cellStyle
                });
            }
            babelHelpers.get(ArticleTable.prototype.__proto__ || Object.getPrototypeOf(ArticleTable.prototype), "setColumns", this).call(this, columns);
        }
    }, {
        key: "getEntries",
        value: function getEntries() {
            return this.sortEntries(this.options.articles);
        }
    }]);
    return ArticleTable;
}(SortableTable);

var ArticleManager = function (_Panel) {
    babelHelpers.inherits(ArticleManager, _Panel);

    function ArticleManager() {
        babelHelpers.classCallCheck(this, ArticleManager);
        return babelHelpers.possibleConstructorReturn(this, (ArticleManager.__proto__ || Object.getPrototypeOf(ArticleManager)).apply(this, arguments));
    }

    babelHelpers.createClass(ArticleManager, [{
        key: "getDefaultOptions",
        value: function getDefaultOptions() {
            return {
                title: "Article manager"
            };
        }
    }, {
        key: "setOptions",
        value: function setOptions(options) {
            options = Object.assign(this.getDefaultOptions(), options);
            babelHelpers.get(ArticleManager.prototype.__proto__ || Object.getPrototypeOf(ArticleManager.prototype), "setOptions", this).call(this, options);
            this.options.articles = this.options.articles || ArticleStore.all();
        }
    }, {
        key: "render",
        value: function render() {
            var _this15 = this;

            var addButton = null;
            if (!this.options.readOnly) {
                addButton = UI.createElement(
                    "div",
                    { className: "pull-right" },
                    UI.createElement(UI.Button, { level: UI.Level.PRIMARY, label: "Create article",
                        onClick: function onClick() {
                            return _this15.createArticleModal.show();
                        },
                        style: { marginTop: "5px", marginBottom: "5px" } })
                );
            }

            return [UI.createElement(
                "div",
                { className: "pull-left" },
                UI.createElement(
                    "h4",
                    null,
                    UI.createElement(
                        "strong",
                        null,
                        this.options.title
                    )
                )
            ), addButton, UI.createElement(ArticleTable, { ref: "table", articles: this.options.articles, parent: this })];
        }
    }, {
        key: "onMount",
        value: function onMount() {
            babelHelpers.get(ArticleManager.prototype.__proto__ || Object.getPrototypeOf(ArticleManager.prototype), "onMount", this).call(this);
            this.getArticles();

            if (this.options.readOnly === true) return;

            this.createArticleModal = UI.createElement(CreateArticleModal, { parent: this });

            if (USER.isSuperUser) {
                this.transferOwnershipModal = UI.createElement(TransferOwnershipModal, { parent: this });
            }

            this.deleteArticleModal = UI.createElement(DeleteArticleModal, { parent: this });
        }
    }, {
        key: "getArticles",
        value: function getArticles() {
            var _this16 = this;

            if (this.options.articles && this.options.articles.length > 0) {
                return;
            }

            var request = {};
            Ajax.getJSON("/get_available_articles/", request).then(function (data) {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    _this16.table.options.articles = ArticleStore.all();
                    _this16.table.redraw();
                }
            }, function (error) {
                console.log("Error in fetching articles");
                console.log(error.message);
                console.log(error.stack);
            });
        }
    }]);
    return ArticleManager;
}(Panel);

var TranslationManager = function (_Panel2) {
    babelHelpers.inherits(TranslationManager, _Panel2);

    function TranslationManager() {
        babelHelpers.classCallCheck(this, TranslationManager);
        return babelHelpers.possibleConstructorReturn(this, (TranslationManager.__proto__ || Object.getPrototypeOf(TranslationManager)).apply(this, arguments));
    }

    babelHelpers.createClass(TranslationManager, [{
        key: "getDefaultOptions",
        value: function getDefaultOptions() {
            return {
                title: "Translation manager"
            };
        }
    }, {
        key: "setOptions",
        value: function setOptions(options) {
            options = Object.assign(this.getDefaultOptions(), options);
            babelHelpers.get(TranslationManager.prototype.__proto__ || Object.getPrototypeOf(TranslationManager.prototype), "setOptions", this).call(this, options);
        }
    }, {
        key: "render",
        value: function render() {
            var _this18 = this;

            this.table = UI.createElement(ArticleTable, { articles: [], parent: this });
            var addButton = null;
            if (!this.options.readOnly) addButton = UI.createElement(
                "div",
                { className: "pull-right" },
                UI.createElement(UI.Button, { level: UI.Level.PRIMARY, label: "Add translation",
                    onClick: function onClick() {
                        return _this18.addTranslationModal.show();
                    },
                    style: { marginTop: "5px", marginBottom: "5px" } })
            );
            return [UI.createElement(
                "div",
                { className: "pull-left" },
                UI.createElement(
                    "h4",
                    null,
                    UI.createElement(
                        "strong",
                        null,
                        this.options.title
                    )
                )
            ), addButton, this.table];
        }
    }, {
        key: "onMount",
        value: function onMount() {
            babelHelpers.get(TranslationManager.prototype.__proto__ || Object.getPrototypeOf(TranslationManager.prototype), "onMount", this).call(this);
            this.getTranslations();

            if (this.options.readOnly === true) return;

            this.addTranslationModal = UI.createElement(AddTranslationModal, { parent: this, baseArticle: this.options.baseArticle });

            if (USER.isSuperUser) {
                this.transferOwnershipModal = UI.createElement(TransferOwnershipModal, { parent: this });
            }

            this.deleteArticleModal = UI.createElement(DeleteArticleModal, { parent: this });
        }
    }, {
        key: "getTranslations",
        value: function getTranslations() {
            var _this19 = this;

            if (!this.options.baseArticle) return;
            var request = {};
            Ajax.getJSON("/article/" + this.options.baseArticle.id + "/get_translations/", request).then(function (data) {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = ArticleStore.all()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var article = _step.value;

                            if (article.baseArticleId == _this19.options.baseArticle.id) {
                                _this19.table.options.articles.push(article);
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

                    _this19.table.redraw();
                }
            }, function (error) {
                console.log("Error in fetching articles");
                console.log(error.message);
                console.log(error.stack);
            });
        }
    }]);
    return TranslationManager;
}(Panel);

export { ArticleManager, TranslationManager };
