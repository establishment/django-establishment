import { Ajax } from "Ajax";
import { GlobalState } from "State";
import { UI, getOffset } from "UI";
import { Draggable } from "Draggable";
import { DocumentationEntryStore } from "DocumentationStore";
import { DocumentationPanel, DocumentationStyle, DocumentationNavElement, DocumentationNavElementContent } from "DocumentationPanel";
import { ArticleSwitcher } from "ArticleRenderer";
import { Dispatcher } from "Dispatcher";

var documentationStyle = new DocumentationStyle();
var dragAndDropHandler = new Dispatcher();
var editEntryHandler = new Dispatcher();

var EditEntryModal = function (_UI$ActionModal) {
    babelHelpers.inherits(EditEntryModal, _UI$ActionModal);

    function EditEntryModal() {
        babelHelpers.classCallCheck(this, EditEntryModal);
        return babelHelpers.possibleConstructorReturn(this, (EditEntryModal.__proto__ || Object.getPrototypeOf(EditEntryModal)).apply(this, arguments));
    }

    babelHelpers.createClass(EditEntryModal, [{
        key: "getTitle",
        value: function getTitle() {
            return "Edit documentation entry";
        }
    }, {
        key: "getActionName",
        value: function getActionName() {
            return "Apply";
        }
    }, {
        key: "getBody",
        value: function getBody() {
            return [UI.createElement(
                UI.Form,
                { style: { "margin-top": "10px", "color": "initial", "font-size": "initial" } },
                UI.createElement(
                    UI.FormField,
                    { label: "URL name", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "urlNameInput", value: this.options.entry.urlName })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Name", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "nameInput", value: this.options.entry.name })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Article Id", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "articleIdInput", value: this.options.entry.articleId })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Parent index", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "parentIndexInput", value: this.options.entry.parentIndex })
                )
            )];
        }
    }, {
        key: "check",
        value: function check(data) {
            if (!data.urlName) {
                return "URL name cannot be empty.";
            }
            if (!data.name) {
                return "Name cannot be empty.";
            }
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = DocumentationEntryStore.all()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var entry = _step.value;

                    if (entry === this.options.entry) {
                        continue;
                    }
                    if (entry.getName() === data.name) {
                        return "Name already exists.";
                    }
                    if (entry.urlName === data.urlName) {
                        return "URL name already exists";
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
        }
    }, {
        key: "action",
        value: function action() {
            var data = {
                entryId: this.options.entry.id,
                urlName: this.urlNameInput.getValue(),
                name: this.nameInput.getValue(),
                articleId: parseInt(this.articleIdInput.getValue()) || 0,
                parentIndex: parseInt(this.parentIndexInput.getValue()) || 0
            };
            var errorMessage = this.check(data);
            if (!errorMessage) {
                Ajax.postJSON("/docs/edit_entry/", data).then(function (data) {
                    if (data.error) {
                        console.log(data.error);
                    } else {
                        GlobalState.importState(data.state || {});
                        editEntryHandler.dispatch();
                    }
                }, function (error) {
                    console.log("Error in deleting workspace:\n" + error.message);
                    console.log(error.stack);
                });
            } else {
                this.messageArea.showMessage(errorMessage, "red");
            }
            this.hide();
        }
    }]);
    return EditEntryModal;
}(UI.ActionModal);

var DraggableDocumentationNavElementContent = function (_Draggable) {
    babelHelpers.inherits(DraggableDocumentationNavElementContent, _Draggable);

    function DraggableDocumentationNavElementContent() {
        babelHelpers.classCallCheck(this, DraggableDocumentationNavElementContent);
        return babelHelpers.possibleConstructorReturn(this, (DraggableDocumentationNavElementContent.__proto__ || Object.getPrototypeOf(DraggableDocumentationNavElementContent)).apply(this, arguments));
    }

    babelHelpers.createClass(DraggableDocumentationNavElementContent, [{
        key: "getNodeAttributes",
        value: function getNodeAttributes() {
            var attr = babelHelpers.get(DraggableDocumentationNavElementContent.prototype.__proto__ || Object.getPrototypeOf(DraggableDocumentationNavElementContent.prototype), "getNodeAttributes", this).call(this);
            attr.setStyle("cursor", "pointer");
            return attr;
        }
    }, {
        key: "getDocumentationEntry",
        value: function getDocumentationEntry() {
            return this.options.parent.getDocumentationEntry();
        }
    }, {
        key: "render",
        value: function render() {
            return [babelHelpers.get(DraggableDocumentationNavElementContent.prototype.__proto__ || Object.getPrototypeOf(DraggableDocumentationNavElementContent.prototype), "render", this).call(this), UI.createElement("span", { className: "fa fa-pencil-square-o", ref: "editEntry",
                style: { "cursor": "pointer", "margin-right": "10px", "float": "right" } })];
        }
    }, {
        key: "getDirectOffsets",
        value: function getDirectOffsets() {
            return {
                top: this.node.offsetTop,
                left: this.node.offsetLeft,
                height: this.node.offsetHeight,
                width: this.node.offsetWidth
            };
        }
    }, {
        key: "getOffset",
        value: function getOffset(type) {
            return this.getDirectOffsets()[type];
        }
    }, {
        key: "onMount",
        value: function onMount() {
            var _this3 = this;

            babelHelpers.get(DraggableDocumentationNavElementContent.prototype.__proto__ || Object.getPrototypeOf(DraggableDocumentationNavElementContent.prototype), "onMount", this).call(this);
            this.editEntry.addClickListener(function () {
                _this3.editModal = _this3.editModal || UI.createElement(EditEntryModal, { entry: _this3.getDocumentationEntry() });
                _this3.editModal.show();
            });
            if (!this.options.parent.options.isRoot) {
                this.addDragListener({
                    onStart: function onStart() {},
                    onDrag: function onDrag(deltaX, deltaY) {
                        if (!_this3.dragged) {
                            _this3.dragged = true;
                            _this3.setStyle("cursor", "move");
                            if (_this3.options.shouldToggle) {
                                _this3.setCollapsed(true);
                            }
                            _this3.setStyle("position", "absolute");
                            _this3.setStyle("border", "2px solid red");
                            _this3.setStyle("border-radius", "3px");
                            _this3.setStyle("width", _this3.node.offsetWidth + 20 + "px");
                            _this3.setStyle("opacity", 0.85);
                        }
                        _this3.setStyle("left", _this3.getOffset("left") + deltaX + "px");
                        _this3.setStyle("top", _this3.getOffset("top") + deltaY + "px");
                        dragAndDropHandler.dispatch("drag", _this3, _this3.getOffset("top"));
                    },
                    onEnd: function onEnd() {
                        if (_this3.dragged) {
                            _this3.dragged = false;
                            dragAndDropHandler.dispatch("drop", _this3, _this3.getOffset("top"));
                        }
                    }
                });
            }
        }
    }]);
    return DraggableDocumentationNavElementContent;
}(Draggable(DocumentationNavElementContent));

var CreateEntryModal = function (_UI$ActionModal2) {
    babelHelpers.inherits(CreateEntryModal, _UI$ActionModal2);

    function CreateEntryModal() {
        babelHelpers.classCallCheck(this, CreateEntryModal);
        return babelHelpers.possibleConstructorReturn(this, (CreateEntryModal.__proto__ || Object.getPrototypeOf(CreateEntryModal)).apply(this, arguments));
    }

    babelHelpers.createClass(CreateEntryModal, [{
        key: "getTitle",
        value: function getTitle() {
            return "Create documentation entry";
        }
    }, {
        key: "getActionName",
        value: function getActionName() {
            return "Create";
        }
    }, {
        key: "getBody",
        value: function getBody() {
            var entries = DocumentationEntryStore.all();
            entries.push({
                toString: function toString() {
                    return "No Parent";
                },
                id: 0
            });
            return [UI.createElement(
                UI.Form,
                { style: { "margin-top": "10px", "color": "initial", "font-size": "initial" } },
                UI.createElement(
                    UI.FormField,
                    { label: "URL name", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "urlNameInput", value: "" })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Name", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "nameInput", value: "" })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Article Id", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "articleIdInput", placeholder: "Enter 0 (or leave blank) to create a new article instead" })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Parent", style: { "font-weight": "initial" } },
                    UI.createElement(UI.Select, { ref: "parentInput", options: entries, activeIndex: entries.length - 1, style: { "height": "30px" } })
                ),
                UI.createElement(
                    UI.FormField,
                    { label: "Parent index", style: { "font-weight": "initial" } },
                    UI.createElement(UI.TextInput, { ref: "parentIndexInput", value: "0" })
                )
            )];
        }
    }, {
        key: "check",
        value: function check(data) {
            if (!data.urlName) {
                return "URL name cannot be empty.";
            }
            if (!data.name) {
                return "Name cannot be empty.";
            }
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = DocumentationEntryStore.all()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var entry = _step2.value;

                    if (entry.getName() === data.name) {
                        return "Name already exists.";
                    }
                    if (entry.urlName === data.urlName) {
                        return "URL name already exists";
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }
    }, {
        key: "action",
        value: function action() {
            var _this5 = this;

            var data = {
                urlName: this.urlNameInput.getValue(),
                name: this.nameInput.getValue(),
                articleId: parseInt(this.articleIdInput.getValue()) || 0,
                parentId: this.parentInput.get().id,
                parentIndex: parseInt(this.parentIndexInput.getValue()) || 0
            };
            var errorMessage = this.check(data);
            if (!errorMessage) {
                Ajax.postJSON("/docs/create/", data).then(function (data) {
                    if (data.error) {
                        console.log(data.error);
                    } else {
                        GlobalState.importState(data.state || {});
                        _this5.dispatch("createdEntry");
                    }
                }, function (error) {
                    console.log("Error in deleting workspace:\n" + error.message);
                    console.log(error.stack);
                });
            } else {
                this.messageArea.showMessage(errorMessage, "red");
            }
            this.hide();
        }
    }]);
    return CreateEntryModal;
}(UI.ActionModal);

var AddEntryButton = UI.ActionModalButton(CreateEntryModal);

var AdminDocumentationPanel = function (_DocumentationPanel) {
    babelHelpers.inherits(AdminDocumentationPanel, _DocumentationPanel);

    function AdminDocumentationPanel() {
        babelHelpers.classCallCheck(this, AdminDocumentationPanel);
        return babelHelpers.possibleConstructorReturn(this, (AdminDocumentationPanel.__proto__ || Object.getPrototypeOf(AdminDocumentationPanel)).apply(this, arguments));
    }

    babelHelpers.createClass(AdminDocumentationPanel, [{
        key: "render",
        value: function render() {
            var documentationEntry = DocumentationEntryStore.get(this.options.documentationEntryId);
            var DocumentationNavElementClass = DocumentationNavElement(DraggableDocumentationNavElementContent);
            return [UI.createElement(
                UI.Panel,
                { orientation: UI.Orientation.HORIZONTAL, className: documentationStyle.panel },
                UI.createElement(
                    UI.Panel,
                    { ref: "navPanel", className: documentationStyle.navPanel },
                    UI.createElement(
                        "div",
                        { style: { "max-height": "90%", "overflow-y": "auto" } },
                        UI.createElement(DocumentationNavElementClass, {
                            ref: "root",
                            documentationEntry: documentationEntry,
                            isRoot: true,
                            panel: this,
                            level: 0,
                            documentationSwitchDispatcher: this.documentationSwitchDispatcher
                        })
                    ),
                    UI.createElement(
                        "div",
                        { style: { "position": "absolute", "bottom": "5%" } },
                        UI.createElement(
                            "div",
                            { ref: "trash", className: "fa fa-trash fa-3x", style: {
                                    color: "#fff",
                                    "margin-left": "15px",
                                    "padding": "10px",
                                    "float": "left"
                                } },
                            " "
                        ),
                        UI.createElement(AddEntryButton, { ref: "addEntryButton", className: "fa fa-plus fa-3x", level: UI.Level.PRIMARY,
                            style: {
                                color: "#fff",
                                "margin-left": "50px"
                            } })
                    )
                ),
                UI.createElement(
                    UI.Panel,
                    { className: documentationStyle.article },
                    UI.createElement(ArticleSwitcher, {
                        ref: "articleSwitcher",
                        initialArticle: documentationEntry.getArticle(),
                        lazyRender: true,
                        showEditButton: true,
                        className: documentationStyle.articleSwitcher })
                )
            )];
        }
    }, {
        key: "redraw",
        value: function redraw() {
            var _this7 = this;

            babelHelpers.get(AdminDocumentationPanel.prototype.__proto__ || Object.getPrototypeOf(AdminDocumentationPanel.prototype), "redraw", this).call(this);
            this.entryNavElementMap = new Map();
            var explore = function explore(entryNavElement) {
                _this7.entryNavElementMap.set(entryNavElement.getDocumentationEntry(), entryNavElement);
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                    for (var _iterator3 = entryNavElement.subEntries[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                        var subEntry = _step3.value;

                        explore(subEntry);
                    }
                } catch (err) {
                    _didIteratorError3 = true;
                    _iteratorError3 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion3 && _iterator3.return) {
                            _iterator3.return();
                        }
                    } finally {
                        if (_didIteratorError3) {
                            throw _iteratorError3;
                        }
                    }
                }
            };
            explore(this.root);
        }
    }, {
        key: "modifyEntry",
        value: function modifyEntry(entry, newParent, nextSibling) {
            var modified = [];
            if (newParent === -1) {
                modified.push({
                    entryId: entry.id,
                    parentId: -1
                });
                DocumentationEntryStore.applyDeleteEvent({
                    objectId: entry.id
                });
            } else if (!newParent) {
                entry.parentId = null;
                entry.parentIndex = null;
                modified.push({
                    entryId: entry.id,
                    parentId: 0,
                    parentIndex: 0
                });
            } else {
                var newBrothers = [];
                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                    for (var _iterator4 = DocumentationEntryStore.all()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        var docEntry = _step4.value;

                        if (docEntry.parentId === newParent.id && docEntry !== entry) {
                            newBrothers.push(docEntry);
                        }
                    }
                } catch (err) {
                    _didIteratorError4 = true;
                    _iteratorError4 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion4 && _iterator4.return) {
                            _iterator4.return();
                        }
                    } finally {
                        if (_didIteratorError4) {
                            throw _iteratorError4;
                        }
                    }
                }

                newBrothers.sort(function (a, b) {
                    return a.parentIndex - b.parentIndex;
                });
                entry.parentId = newParent.id;
                if (newBrothers.length) {
                    newBrothers[0].parentIndex = 1;
                    if (nextSibling === newBrothers[0]) {
                        entry.parentIndex = 1;
                        newBrothers[0].parentIndex = 2;
                    }
                    modified.push({
                        entryId: newBrothers[0].id,
                        parentIndex: newBrothers[0].parentIndex
                    });
                    for (var i = 1; i < newBrothers.length; i += 1) {
                        newBrothers[i].parentIndex = newBrothers[i - 1].parentIndex + 1;
                        if (newBrothers[i] === nextSibling) {
                            entry.parentIndex = newBrothers[i].parentIndex;
                            newBrothers[i].parentIndex += 1;
                        }
                        modified.push({
                            entryId: newBrothers[i].id,
                            parentIndex: newBrothers[i].parentIndex
                        });
                    }
                    if (!nextSibling) {
                        entry.parentIndex = newBrothers.length + 1;
                    }
                }
                modified.push({
                    entryId: entry.id,
                    parentId: newParent.id,
                    parentIndex: entry.parentIndex
                });
            }
            Ajax.postJSON("/docs/change_parents/", { "modifiedEntries": JSON.stringify(modified) }).then(function () {
                console.log("successfully changed parent indices!");
            }, function (error) {
                console.log(error.message);
                console.log(error.stack);
            });
        }
    }, {
        key: "setTarget",
        value: function setTarget(element, eventType, borderType, visibleEntries) {
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = visibleEntries[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var visibleElement = _step5.value;

                    visibleElement.titleElement.setStyle("border", "");
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            this.trash.setStyle("border", "");
            if (!element) {
                this.trash.setStyle("border", "2px solid red");
                return;
            }
            if (eventType === "drag") {
                element.titleElement.setStyle(borderType, "2px solid red");
                return [null, null, null];
            } else {
                var newParent = void 0,
                    nextSibling = void 0;
                // Drop: add the element to its new position
                if (borderType === "border") {
                    newParent = element.getDocumentationEntry();
                    nextSibling = null;
                    var _iteratorNormalCompletion6 = true;
                    var _didIteratorError6 = false;
                    var _iteratorError6 = undefined;

                    try {
                        for (var _iterator6 = DocumentationEntryStore.all()[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var docEntry = _step6.value;

                            if (docEntry.parentId === newParent.id && (nextSibling === null || nextSibling.parentIndex > docEntry.parentIndex)) {
                                nextSibling = docEntry;
                            }
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                                _iterator6.return();
                            }
                        } finally {
                            if (_didIteratorError6) {
                                throw _iteratorError6;
                            }
                        }
                    }
                } else if (borderType === "border-top") {
                    nextSibling = element.getDocumentationEntry();
                    newParent = DocumentationEntryStore.get(nextSibling.parentId);
                } else {
                    nextSibling = element.getDocumentationEntry();
                    newParent = DocumentationEntryStore.get(nextSibling.parentId);
                    nextSibling = null;
                }
                return [newParent, nextSibling];
            }
        }
    }, {
        key: "getTrashOffset",
        value: function getTrashOffset() {
            // -50px for the navbar
            return getOffset(this.trash).top - 50;
        }
    }, {
        key: "redrawAndUncollapse",
        value: function redrawAndUncollapse(visibleEntries, entry) {
            var _this8 = this;

            this.redraw();
            var visibleEntryIds = new Set();
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = visibleEntries[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var visibleEntry = _step7.value;

                    visibleEntryIds.add(visibleEntry.getDocumentationEntry().id);
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }

            var exploreAndUncollapse = function exploreAndUncollapse(entryNavElement) {
                if (entryNavElement.getDocumentationEntry() === entry) {
                    return;
                }
                if (visibleEntryIds.has(entryNavElement.getDocumentationEntry().id) && entryNavElement.getDocumentationEntry().parentId) {
                    var parentEntry = DocumentationEntryStore.get(entryNavElement.getDocumentationEntry().parentId);
                    var parentEntryNavElement = _this8.entryNavElementMap.get(parentEntry);
                    if (parentEntryNavElement.titleElement.options.shouldToggle) {
                        parentEntryNavElement.titleElement.setCollapsed(false);
                    }
                }
                var _iteratorNormalCompletion8 = true;
                var _didIteratorError8 = false;
                var _iteratorError8 = undefined;

                try {
                    for (var _iterator8 = entryNavElement.subEntries[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                        var subEntry = _step8.value;

                        exploreAndUncollapse(subEntry);
                    }
                } catch (err) {
                    _didIteratorError8 = true;
                    _iteratorError8 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion8 && _iterator8.return) {
                            _iterator8.return();
                        }
                    } finally {
                        if (_didIteratorError8) {
                            throw _iteratorError8;
                        }
                    }
                }
            };
            exploreAndUncollapse(this.root);
        }
    }, {
        key: "getVisibleEntries",
        value: function getVisibleEntries(draggedItem) {
            var visibleEntries = [];
            var exploreEntries = function exploreEntries(entryNavElement) {
                if (entryNavElement.titleElement === draggedItem) {
                    return;
                }
                visibleEntries.push(entryNavElement);
                if (!entryNavElement.titleElement.options.collapsed) {
                    var _iteratorNormalCompletion9 = true;
                    var _didIteratorError9 = false;
                    var _iteratorError9 = undefined;

                    try {
                        for (var _iterator9 = entryNavElement.subEntries[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                            var subEntry = _step9.value;

                            exploreEntries(subEntry);
                        }
                    } catch (err) {
                        _didIteratorError9 = true;
                        _iteratorError9 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                                _iterator9.return();
                            }
                        } finally {
                            if (_didIteratorError9) {
                                throw _iteratorError9;
                            }
                        }
                    }
                }
            };
            exploreEntries(this.root);
            return visibleEntries;
        }
    }, {
        key: "onMount",
        value: function onMount() {
            var _this9 = this;

            babelHelpers.get(AdminDocumentationPanel.prototype.__proto__ || Object.getPrototypeOf(AdminDocumentationPanel.prototype), "onMount", this).call(this);
            this.addEntryButton.modal.addListener("createdEntry", function () {
                _this9.redrawAndUncollapse(_this9.getVisibleEntries());
            });
            editEntryHandler.addListener(function () {
                _this9.redrawAndUncollapse(_this9.getVisibleEntries());
            });
            dragAndDropHandler.addListener(function (type, draggedItem, top) {
                var titleHeight = 40;

                var visibleEntries = _this9.getVisibleEntries(draggedItem);
                if (!visibleEntries.length) {
                    return;
                }

                // TODO: Refactor this! Make UIElement or NodeWrapper support direct offsets
                var getTop = function getTop(element) {
                    return element.titleElement.getOffset("top");
                };

                visibleEntries.sort(function (a, b) {
                    return getTop(a) - getTop(b);
                });

                var entry = draggedItem.getDocumentationEntry(),
                    newParent = null,
                    nextSibling = null;
                if (Math.abs(_this9.getTrashOffset() - top) < titleHeight * 2) {
                    newParent = -1;
                    _this9.setTarget(null, type, "border", visibleEntries);
                } else {
                    if (getTop(visibleEntries[0]) > top) {
                        var _setTarget = _this9.setTarget(visibleEntries[0], type, "border-top", visibleEntries);

                        var _setTarget2 = babelHelpers.slicedToArray(_setTarget, 2);

                        newParent = _setTarget2[0];
                        nextSibling = _setTarget2[1];
                    } else if (getTop(visibleEntries[visibleEntries.length - 1]) + titleHeight * 0.25 < top) {
                        var _setTarget3 = _this9.setTarget(visibleEntries[visibleEntries.length - 1], type, "border-bottom", visibleEntries);

                        var _setTarget4 = babelHelpers.slicedToArray(_setTarget3, 2);

                        newParent = _setTarget4[0];
                        nextSibling = _setTarget4[1];
                    } else {
                        var bordered = false;
                        var _iteratorNormalCompletion10 = true;
                        var _didIteratorError10 = false;
                        var _iteratorError10 = undefined;

                        try {
                            for (var _iterator10 = visibleEntries[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                                var visibleEntry = _step10.value;

                                if (Math.abs(getTop(visibleEntry) - top) < titleHeight * 0.25) {
                                    var _setTarget9 = _this9.setTarget(visibleEntry, type, "border", visibleEntries);

                                    var _setTarget10 = babelHelpers.slicedToArray(_setTarget9, 2);

                                    newParent = _setTarget10[0];
                                    nextSibling = _setTarget10[1];

                                    bordered = true;
                                    break;
                                }
                            }
                        } catch (err) {
                            _didIteratorError10 = true;
                            _iteratorError10 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion10 && _iterator10.return) {
                                    _iterator10.return();
                                }
                            } finally {
                                if (_didIteratorError10) {
                                    throw _iteratorError10;
                                }
                            }
                        }

                        if (!bordered) {
                            for (var i = 0; i < visibleEntries.length; i += 1) {
                                if (getTop(visibleEntries[i]) > top) {
                                    if (i > 0 && top - getTop(visibleEntries[i - 1]) < getTop(visibleEntries[i]) - top && visibleEntries[i].getDocumentationEntry().parentId !== visibleEntries[i - 1].getDocumentationEntry().id) {
                                        var _setTarget5 = _this9.setTarget(visibleEntries[i - 1], type, "border-bottom", visibleEntries);

                                        var _setTarget6 = babelHelpers.slicedToArray(_setTarget5, 2);

                                        newParent = _setTarget6[0];
                                        nextSibling = _setTarget6[1];
                                    } else {
                                        var _setTarget7 = _this9.setTarget(visibleEntries[i], type, "border-top", visibleEntries);

                                        var _setTarget8 = babelHelpers.slicedToArray(_setTarget7, 2);

                                        newParent = _setTarget8[0];
                                        nextSibling = _setTarget8[1];
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }

                if (type === "drop") {
                    var changePosition = function changePosition(modifyEntry) {
                        if (modifyEntry) {
                            _this9.modifyEntry(entry, newParent, nextSibling);
                        }
                        _this9.redrawAndUncollapse(visibleEntries, entry);
                    };

                    if (newParent === -1) {
                        if (window.confirm("Are you sure you want to delete this entry and all it's sub-entries?")) {
                            changePosition(true);
                        } else {
                            changePosition(false);
                        }
                    } else {
                        changePosition(true);
                    }
                }
            });
        }
    }]);
    return AdminDocumentationPanel;
}(DocumentationPanel);

export { AdminDocumentationPanel };
