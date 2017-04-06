import { UI, Button, ButtonGroup, Panel, ActionModal, SectionDivider, TextArea, TabArea } from "UI";
import { GlobalState } from "State";
import { Ajax } from "Ajax";
import { MarkupEditor } from "MarkupEditor";
import { ArticleRenderer } from "ArticleRenderer";
import { ArticleStore } from "ArticleStore";
import { Language } from "LanguageStore";
import { TranslationManager } from "ArticleManager";
var deleteRedirectLink = "/";

//TODO (@kira) : 4. fix line wrapping 5.Fix diffing svg gutter bug 7.Collapse button in section Divider maybe?

var ArticleMarkupEditor = function (_MarkupEditor) {
    babelHelpers.inherits(ArticleMarkupEditor, _MarkupEditor);

    function ArticleMarkupEditor() {
        babelHelpers.classCallCheck(this, ArticleMarkupEditor);
        return babelHelpers.possibleConstructorReturn(this, (ArticleMarkupEditor.__proto__ || Object.getPrototypeOf(ArticleMarkupEditor)).apply(this, arguments));
    }

    babelHelpers.createClass(ArticleMarkupEditor, [{
        key: "setOptions",
        value: function setOptions(options) {
            babelHelpers.get(ArticleMarkupEditor.prototype.__proto__ || Object.getPrototypeOf(ArticleMarkupEditor.prototype), "setOptions", this).call(this, options);
            this.options.value = this.options.article.markup;
        }
    }, {
        key: "setEditorOptions",
        value: function setEditorOptions() {
            var _this2 = this;

            this.editorPanel.addListener("resize", function () {
                _this2.codeEditor.setWidth(_this2.editorPanel.getWidth() - 15);
            });

            this.codeEditor.addNodeListener("input", function () {
                var markup = _this2.codeEditor.getValue();
                try {
                    _this2.updateValue(markup);
                } catch (e) {
                    console.error("Exception in parsing markup: ", e);
                }
            });
        }
    }, {
        key: "getEditor",
        value: function getEditor() {
            return UI.createElement(TextArea, { ref: "codeEditor", style: {
                    width: "calc(100% - 15px)",
                    fontFamily: "monospace",
                    minHeight: "300px",
                    resize: "vertical",
                    backgroundColor: "#F9F9F9"
                }, value: this.options.value });
        }
    }, {
        key: "getMarkupRenderer",
        value: function getMarkupRenderer() {
            return UI.createElement(ArticleRenderer, { ref: "articleRenderer", article: this.options.article, style: { flex: "1", height: "100%" } });
        }
    }, {
        key: "updateValue",
        value: function updateValue(markup) {
            this.options.article.markup = markup;
            this.articleRenderer.setValue(markup);
            this.articleRenderer.redraw();
        }
    }]);
    return ArticleMarkupEditor;
}(MarkupEditor);

var DeleteArticleModal = function (_ActionModal) {
    babelHelpers.inherits(DeleteArticleModal, _ActionModal);

    function DeleteArticleModal() {
        babelHelpers.classCallCheck(this, DeleteArticleModal);
        return babelHelpers.possibleConstructorReturn(this, (DeleteArticleModal.__proto__ || Object.getPrototypeOf(DeleteArticleModal)).apply(this, arguments));
    }

    babelHelpers.createClass(DeleteArticleModal, [{
        key: "getActionName",
        value: function getActionName() {
            return "Delete Article";
        }
    }, {
        key: "getBody",
        value: function getBody() {
            return UI.createElement(
                "p",
                null,
                "Delete ",
                this.options.article.name,
                "?"
            );
        }
    }, {
        key: "getFooter",
        value: function getFooter() {
            var _this4 = this;

            return [UI.createElement(UI.TemporaryMessageArea, { ref: "messageArea" }), UI.createElement(
                UI.ButtonGroup,
                null,
                UI.createElement(UI.Button, { label: "Close", onClick: function onClick() {
                        return _this4.hide();
                    } }),
                UI.createElement(UI.AjaxButton, { ref: "deleteArticleButton", level: UI.Level.DANGER, onClick: function onClick() {
                        _this4.deleteArticle();
                    },
                    statusOptions: ["Delete article", { faIcon: "spinner fa-spin", label: " deleting article ..." }, "Delete article", "Failed"] })
            )];
        }
    }, {
        key: "deleteArticle",
        value: function deleteArticle() {
            var _this5 = this;

            var request = {};
            this.deleteArticleButton.ajaxCall({
                url: "/article/" + this.options.article.id + "/delete/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    if (data.error) {
                        console.log(data.error);
                        _this5.messageArea.showMessage(data.error, "red");
                    } else {
                        console.log("Successfully deleted article", data);
                        if (_this5.options.article.baseArticleId) window.location.replace("/article/" + _this5.options.article.baseArticleId + "/edit/");else window.location.replace(deleteRedirectLink);
                    }
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in deleting article:\n" + xhr.status + ":\n" + xhr.responseText);
                    _this5.messageArea.showMessage("Error in deleting article", "red");
                }
            });
        }
    }]);
    return DeleteArticleModal;
}(ActionModal);

var ArticleEditor = function (_Panel) {
    babelHelpers.inherits(ArticleEditor, _Panel);

    function ArticleEditor() {
        babelHelpers.classCallCheck(this, ArticleEditor);
        return babelHelpers.possibleConstructorReturn(this, (ArticleEditor.__proto__ || Object.getPrototypeOf(ArticleEditor)).apply(this, arguments));
    }

    babelHelpers.createClass(ArticleEditor, [{
        key: "setOptions",
        value: function setOptions(options) {
            babelHelpers.get(ArticleEditor.prototype.__proto__ || Object.getPrototypeOf(ArticleEditor.prototype), "setOptions", this).call(this, options);
            this.options.article = ArticleStore.get(this.options.articleId);

            if (ArticleEditor.DiffWidgetClass) {
                this.versions = [];
                this.versionsLabels = [];
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.options.article.getEdits()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var article = _step.value;

                        this.versions.push(article.content);
                        this.versionsLabels.push("Version " + article.id);
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

                this.versions.push(this.options.article.markup);
                this.versionsLabels.push("Edit version");
                this.versions.reverse();
                this.versionsLabels.reverse();

                this.leftEditable = true;
                this.rightEditable = false;
            }
        }
    }, {
        key: "render",
        value: function render() {
            var _this7 = this;

            console.log(this.options.article);
            var translationsPanel = null;
            var baseArticleForm = null;
            if (this.options.article.baseArticleId) {
                baseArticleForm = UI.createElement(
                    UI.FormField,
                    { ref: "baseArticleFormField", label: "Base article" },
                    UI.createElement(
                        "a",
                        { href: "/article/" + this.options.article.baseArticleId + "/edit/" },
                        "Go to base article"
                    )
                );
            } else {
                translationsPanel = UI.createElement(
                    UI.Panel,
                    { title: "Translations" },
                    UI.createElement(TranslationManager, { title: "Translations for " + this.options.article.name,
                        baseArticle: this.options.article })
                );
            }
            var ownershipPanel = null;
            if (USER.isSuperUser) {
                ownershipPanel = UI.createElement(
                    UI.Panel,
                    { title: "Ownership" },
                    UI.createElement(
                        UI.Form,
                        { style: { marginTop: "10px" } },
                        UI.createElement(
                            UI.FormField,
                            { ref: "ownerFormField", label: "Author ID" },
                            UI.createElement(UI.TextInput, { ref: "ownerFormInput", value: this.options.article.userCreatedId })
                        )
                    ),
                    UI.createElement(UI.AjaxButton, { ref: "setOwnerButton", level: UI.Level.INFO, onClick: function onClick() {
                            var newOwner = _this7.ownerFormInput.getValue();
                            _this7.setOwner(newOwner);
                        },
                        statusOptions: ["Transfer ownership", { faIcon: "spinner fa-spin", label: " transfering ownership ..." }, "Transfer ownership", "Failed"]
                    }),
                    UI.createElement(UI.TemporaryMessageArea, { ref: "setOwnerMessageArea" })
                );
            }

            var revisionsPanel = void 0;
            if (ArticleEditor.DiffWidgetClass) {
                var DiffWidgetClass = ArticleEditor.DiffWidgetClass;
                revisionsPanel = UI.createElement(
                    UI.Panel,
                    { title: "Revisions" },
                    UI.createElement(
                        UI.Panel,
                        null,
                        UI.createElement(UI.Select, { ref: "leftTextSelector", options: this.versionsLabels }),
                        UI.createElement(UI.Select, { style: { float: "right", marginRight: "25px" }, ref: "rightTextSelector", options: this.versionsLabels })
                    ),
                    UI.createElement(DiffWidgetClass, { ref: "diffWidget", leftEditable: this.leftEditable, rightEditable: this.rightEditable,
                        leftTextValue: this.versions[2], arrows: this.arrows, rightTextValue: this.versions[1],
                        style: { height: "800px", width: "calc(100% - 100px)" } })
                );
            }

            return [UI.createElement(
                "h3",
                null,
                this.options.article.name + " Id=" + this.options.article.id
            ), UI.createElement(
                TabArea,
                { ref: "tabArea", variableHeightPanels: true, style: { height: "100%" } },
                UI.createElement(
                    UI.Panel,
                    { title: "Edit", active: true, style: { height: "100%", overflow: "hidden" } },
                    UI.createElement(UI.AjaxButton, { ref: "saveMarkupButton", level: UI.Level.INFO, onClick: function onClick() {
                            var content = _this7.markupEditor.getValue();
                            _this7.saveMarkup(content);
                        },
                        statusOptions: ["Save", { faIcon: "spinner fa-spin", label: " saveing ..." }, "Save", "Failed"]
                    }),
                    UI.createElement(UI.TemporaryMessageArea, { ref: "saveMarkupMessageArea" }),
                    UI.createElement(ArticleMarkupEditor, { style: { height: "100%", marginTop: "-30px", display: "flex", flexDirection: "column" },
                        ref: "markupEditor", article: this.options.article })
                ),
                revisionsPanel,
                UI.createElement(
                    UI.Panel,
                    { title: "Summary" },
                    UI.createElement(
                        UI.Form,
                        { style: { marginTop: "10px" } },
                        UI.createElement(
                            UI.FormField,
                            { ref: "articleNameFormField", label: "Article name" },
                            UI.createElement(UI.TextInput, { ref: "articleNameFormInput", value: this.options.article.name })
                        ),
                        UI.createElement(
                            UI.FormField,
                            { ref: "dependencyFormField", label: "Dependencies" },
                            UI.createElement(UI.TextInput, { ref: "dependencyFormInput", value: this.options.article.dependency })
                        ),
                        baseArticleForm,
                        UI.createElement(
                            UI.FormField,
                            { ref: "languageFormField", label: "Language" },
                            UI.createElement(UI.Select, { ref: "languageSelect", options: Language.all(),
                                selected: Language.get(this.options.article.languageId) })
                        ),
                        UI.createElement(
                            UI.FormField,
                            { ref: "publicFormField", label: "Public" },
                            UI.createElement(UI.CheckboxInput, { ref: "publicCheckbox", checked: this.options.article.isPublic })
                        )
                    ),
                    UI.createElement(UI.AjaxButton, { ref: "saveOptionsButton", level: UI.Level.INFO, onClick: function onClick() {
                            var name = _this7.articleNameFormInput.getValue();
                            var dependency = _this7.dependencyFormInput.getValue();
                            var languageId = _this7.languageSelect.get().id;
                            var isPublic = _this7.publicCheckbox.getValue();
                            var options = {
                                name: name,
                                dependency: dependency,
                                languageId: languageId,
                                isPublic: isPublic
                            };
                            _this7.saveOptions(options);
                        },
                        statusOptions: ["Save", { faIcon: "spinner fa-spin", label: " saveing ..." }, "Save", "Failed"]
                    }),
                    UI.createElement(UI.Button, { ref: "deleteArticleButton", level: UI.Level.DANGER, label: "Delete article",
                        style: { marginLeft: "3px" },
                        onClick: function onClick() {
                            return _this7.deleteArticleModal.show();
                        } }),
                    UI.createElement(UI.TemporaryMessageArea, { ref: "saveOptionsMessageArea" })
                ),
                translationsPanel,
                ownershipPanel
            )];
        }
    }, {
        key: "saveMarkup",
        value: function saveMarkup(content) {
            var _this8 = this;

            var request = {
                markup: content
            };

            this.saveMarkupMessageArea.showMessage("Saving...", "black", null);

            this.saveMarkupButton.ajaxCall({
                url: "/article/" + this.options.article.id + "/edit/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    // Add a new version in the dropdown if the save is a success
                    if (ArticleEditor.DiffWidgetClass) {
                        _this8.addNewVersion(content);
                    }
                    console.log("Successfully saved article", data);
                    _this8.saveMarkupMessageArea.showMessage("Saved article");
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in saving article:\n" + xhr.status + ":\n" + xhr.responseText);
                    _this8.saveMarkupMessageArea.showMessage("Error in saving the article", "red");
                }
            });
        }
    }, {
        key: "saveOptions",
        value: function saveOptions(options) {
            var _this9 = this;

            var request = {};
            Object.assign(request, options);

            this.saveOptionsMessageArea.showMessage("Saving...", "black", null);

            this.saveOptionsButton.ajaxCall({
                url: "/article/" + this.options.article.id + "/edit/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    if (data.error) {
                        console.log(data.error);
                        _this9.saveOptionsMessageArea.showMessage(data.error, "red");
                    } else {
                        console.log("Successfully saved article", data);
                        _this9.saveOptionsMessageArea.showMessage("Successfully saved article");
                        window.location.replace("/article/" + _this9.options.article.id + "/edit/");
                    }
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in saving article:\n" + xhr.status + ":\n" + xhr.responseText);
                    _this9.saveOptionsMessageArea.showMessage("Error in saving the article", "red");
                }
            });
        }
    }, {
        key: "setOwner",
        value: function setOwner(newOwner) {
            var _this10 = this;

            var request = {
                newOwner: newOwner
            };

            this.setOwnerMessageArea.showMessage("Saving...", "black", null);

            this.setOwnerButton.ajaxCall({
                url: "/article/" + this.options.article.id + "/set_owner/",
                type: "POST",
                dataType: "json",
                data: request,
                success: function success(data) {
                    if (data.error) {
                        console.log(data.error);
                        _this10.setOwnerMessageArea.showMessage(data.error, "red");
                    } else {
                        console.log("Successfully changed owner", data);
                        _this10.setOwnerMessageArea.showMessage("Author successfully changed");
                    }
                },
                error: function error(xhr, errmsg, err) {
                    console.log("Error in changing owner:\n" + xhr.status + ":\n" + xhr.responseText);
                    _this10.setOwnerMessageArea.showMessage("Error in changing owner", "red");
                }
            });
        }
    }, {
        key: "addNewVersion",
        value: function addNewVersion(content) {
            this.versionsLabels[0] = "Version " + this.versionsLabels.length;
            this.versions[0] = content;

            this.versions.unshift(this.markupEditor.getValue());
            this.versionsLabels.unshift("Edit version");

            var leftIndex = this.leftTextSelector.getIndex();
            var rightIndex = this.rightTextSelector.getIndex();

            this.leftTextSelector.redraw();
            this.rightTextSelector.redraw();

            this.setLeftIndex(leftIndex);
            this.setRightIndex(rightIndex);
        }
    }, {
        key: "setLeftIndex",
        value: function setLeftIndex(index) {
            this.leftTextSelector.setIndex(index);
            this.diffWidget.setLeftText(this.versions[index]);
        }
    }, {
        key: "setRightIndex",
        value: function setRightIndex(index) {
            this.rightTextSelector.setIndex(index);
            this.diffWidget.setRightText(this.versions[index]);
        }
    }, {
        key: "onMount",
        value: function onMount() {
            var _this11 = this;

            this.deleteArticleModal = UI.createElement(DeleteArticleModal, { article: this.options.article });

            if (ArticleEditor.DiffWidgetClass) {
                this.tabArea.titleArea.children[1].addClickListener(function () {
                    _this11.versions[0] = _this11.markupEditor.getValue();
                    _this11.setLeftIndex(_this11.leftTextSelector.getIndex());
                    _this11.setRightIndex(_this11.rightTextSelector.getIndex());
                    //this.diffWidget.diffGutterPanel.scroll();
                });

                var updateEditable = function updateEditable() {
                    _this11.leftEditable = _this11.leftTextSelector.getIndex() === 0;
                    _this11.rightEditable = _this11.rightTextSelector.getIndex() === 0;
                    _this11.diffWidget.setLeftEditable(_this11.leftEditable);
                    _this11.diffWidget.setRightEditable(_this11.rightEditable);
                };

                this.leftTextSelector.addChangeListener(function () {
                    _this11.diffWidget.setLeftText(_this11.versions[_this11.leftTextSelector.getIndex()]);
                    updateEditable();
                });

                this.rightTextSelector.addChangeListener(function () {
                    _this11.diffWidget.setRightText(_this11.versions[_this11.rightTextSelector.getIndex()]);
                    updateEditable();
                });

                this.setLeftIndex(0);
                this.setRightIndex(1);

                //this.diffWidget.diffGutter.redraw();
            }

            window.onbeforeunload = function () {
                // Are you sure you want to close the page?
                return "";
            };
        }
    }]);
    return ArticleEditor;
}(Panel);

export { ArticleEditor };
