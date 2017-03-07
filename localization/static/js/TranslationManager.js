define(["exports", "UI", "TranslationStore", "GlobalState", "LanguageStore", "Dispatcher", "URLRouter", "FileSaver", "Ajax"], function (exports, _UI, _TranslationStore, _GlobalState, _LanguageStore, _Dispatcher, _URLRouter, _FileSaver, _Ajax) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.TranslationManager = undefined;

    var _FileSaver2 = _interopRequireDefault(_FileSaver);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

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

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

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

    function ajaxCall(request, successOperation, failOperation) {
        _Ajax.Ajax.post({
            url: "/edit_translation/",
            data: request,
            success: function success(data) {
                if (data.error) {
                    console.log(data.error);
                    if (failOperation) {
                        failOperation(data);
                    }
                } else {
                    _GlobalState.GlobalState.importState(data.state);
                    if (successOperation) {
                        successOperation(data);
                    }
                }
            },
            error: function error(xhr, errmsg, err) {
                console.log(errmsg);
                if (failOperation) {
                    failOperation(data);
                }
            }
        });
    }

    var TranslationEntryTableRow = function (_UI$TableRow) {
        _inherits(TranslationEntryTableRow, _UI$TableRow);

        function TranslationEntryTableRow() {
            _classCallCheck(this, TranslationEntryTableRow);

            return _possibleConstructorReturn(this, (TranslationEntryTableRow.__proto__ || Object.getPrototypeOf(TranslationEntryTableRow)).apply(this, arguments));
        }

        _createClass(TranslationEntryTableRow, [{
            key: "setOptions",
            value: function setOptions(options) {
                _get(TranslationEntryTableRow.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryTableRow.prototype), "setOptions", this).call(this, options);
                this.options.saveButton = this.saveButton;
            }
        }, {
            key: "onMount",
            value: function onMount() {
                var _this2 = this;

                _get(TranslationEntryTableRow.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryTableRow.prototype), "onMount", this).call(this);

                this.saveButton.addClickListener(function () {
                    _this2.saveKey();
                });

                this.entryInput.onChange(function () {
                    _this2.markChanged();
                });
            }
        }, {
            key: "redraw",
            value: function redraw() {
                _get(TranslationEntryTableRow.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryTableRow.prototype), "redraw", this).call(this);
                this.options.entryInput = this.entryInput;
            }
        }, {
            key: "markChanged",
            value: function markChanged() {
                this.setStyle("background-color", "lightblue");
            }
        }, {
            key: "markUnchanged",
            value: function markUnchanged() {
                this.setStyle("background-color", "white");
            }
        }, {
            key: "saveKey",
            value: function saveKey() {
                var _this3 = this;

                var entry = this.options.entry;
                var editEntries = [{
                    keyId: entry.key.id,
                    languageId: entry.language.id,
                    newValue: this.entryInput.getValue()
                }];
                var request = {
                    csrfmiddlewaretoken: CSRF_TOKEN,
                    editEntries: JSON.stringify(editEntries)
                };
                ajaxCall(request, function () {
                    _this3.markUnchanged();
                });
            }
        }, {
            key: "getEntryInput",
            value: function getEntryInput() {
                return this.options.entryInput;
            }
        }]);

        return TranslationEntryTableRow;
    }(_UI.UI.TableRow);

    var TranslationEntryTable = function (_UI$Table) {
        _inherits(TranslationEntryTable, _UI$Table);

        function TranslationEntryTable() {
            _classCallCheck(this, TranslationEntryTable);

            return _possibleConstructorReturn(this, (TranslationEntryTable.__proto__ || Object.getPrototypeOf(TranslationEntryTable)).apply(this, arguments));
        }

        _createClass(TranslationEntryTable, [{
            key: "setOptions",
            value: function setOptions(options) {
                _get(TranslationEntryTable.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryTable.prototype), "setOptions", this).call(this, options);
                this.language = options.language;
            }
        }, {
            key: "getRowClass",
            value: function getRowClass() {
                return TranslationEntryTableRow;
            }
        }, {
            key: "setColumns",
            value: function setColumns() {
                var numberStyle = {
                    textAlign: "right"
                };

                _get(TranslationEntryTable.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryTable.prototype), "setColumns", this).call(this, [{
                    value: function value(entry) {
                        return entry.key.id;
                    },
                    headerName: "Key ID",
                    sortDescending: true,
                    cellStyle: numberStyle,
                    headerStyle: numberStyle
                }, {
                    value: function value(entry) {
                        return entry.key.value;
                    },
                    headerName: "Entry value",
                    sortDescending: true,
                    cellStyle: numberStyle,
                    headerStyle: numberStyle
                }, {
                    value: function value(entry) {
                        return _UI.UI.createElement(
                            "div",
                            { className: "form-group" },
                            _UI.UI.createElement(_UI.UI.TextInput, { ref: "entryInput", value: entry.entry ? entry.entry.value : "" })
                        );
                    },
                    headerName: "Key value",
                    sortDescending: true,
                    cellStyle: numberStyle,
                    headerStyle: numberStyle
                }, {
                    value: function value(entry) {
                        return _UI.UI.createElement(
                            "div",
                            { className: "form-group" },
                            _UI.UI.createElement(_UI.UI.Button, { ref: "saveButton", label: "Save", level: _UI.UI.Level.INFO })
                        );
                    },
                    headerName: "Actions",
                    sortDescending: true
                }]);
            }
        }, {
            key: "getEntryKey",
            value: function getEntryKey(entry, index) {
                return index;
            }
        }, {
            key: "getEntries",
            value: function getEntries() {
                var language = this.language;
                var keyEntryMap = new Map();
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = _TranslationStore.TranslationEntryStore.all()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var entry = _step.value;

                        if (entry.getLanguage().id === language.id) {
                            keyEntryMap.set(entry.getTranslationKey().id, entry);
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

                var ret = [];
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = _TranslationStore.TranslationKeyStore.all()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var key = _step2.value;

                        ret.push({ key: key, entry: keyEntryMap.get(key.id), language: language });
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

                return ret;
            }
        }]);

        return TranslationEntryTable;
    }(_UI.UI.Table);

    var TranslationEntryManager = function (_UI$Panel) {
        _inherits(TranslationEntryManager, _UI$Panel);

        function TranslationEntryManager() {
            _classCallCheck(this, TranslationEntryManager);

            return _possibleConstructorReturn(this, (TranslationEntryManager.__proto__ || Object.getPrototypeOf(TranslationEntryManager)).apply(this, arguments));
        }

        _createClass(TranslationEntryManager, [{
            key: "setOptions",
            value: function setOptions(options) {
                _get(TranslationEntryManager.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryManager.prototype), "setOptions", this).call(this, options);
                this.language = _LanguageStore.Language.get(1);
            }
        }, {
            key: "render",
            value: function render() {
                var languageOptions = this.getLanguageOptions();
                return [_UI.UI.createElement(
                    "div",
                    { className: "form-group" },
                    _UI.UI.createElement(_UI.UI.Select, { className: "form-control", options: languageOptions, ref: "languageSelect" }),
                    _UI.UI.createElement(TranslationEntryTable, { ref: "translationTable", language: this.language })
                ), _UI.UI.createElement(
                    "div",
                    { className: "btn-group" },
                    _UI.UI.createElement(_UI.UI.Button, { ref: "saveAllButton", label: "Save all", level: _UI.UI.Level.INFO }),
                    _UI.UI.createElement(
                        _UI.UI.Button,
                        { className: "btn file-upload-button pull-left", level: _UI.UI.Level.INFO, label: "Import", ref: "importButton" },
                        _UI.UI.createElement(_UI.UI.FileInput, { ref: "uploadFile" })
                    ),
                    _UI.UI.createElement(_UI.UI.Button, { ref: "exportButton", label: "Export", level: _UI.UI.Level.INFO })
                )];
            }
        }, {
            key: "getLanguageOptions",
            value: function getLanguageOptions() {
                var ret = [];
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                    var _loop = function _loop() {
                        var language = _step3.value;

                        ret.push({
                            value: language,
                            toString: function toString() {
                                return language.name;
                            }
                        });
                    };

                    for (var _iterator3 = _LanguageStore.Language.all()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                        _loop();
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

                return ret;
            }
        }, {
            key: "onMount",
            value: function onMount() {
                var _this6 = this;

                _get(TranslationEntryManager.prototype.__proto__ || Object.getPrototypeOf(TranslationEntryManager.prototype), "onMount", this).call(this);

                this.languageSelect.onChange(function () {
                    _this6.changeLanguage();
                });
                this.saveAllButton.addClickListener(function () {
                    _this6.saveAll();
                });
                this.importButton.addClickListener(function () {
                    _this6.importFromFile();
                });
                this.exportButton.addClickListener(function () {
                    _this6.exportToFile();
                });
            }
        }, {
            key: "changeLanguage",
            value: function changeLanguage() {
                this.language = this.languageSelect.get().value;
                this.redraw();
            }
        }, {
            key: "saveAll",
            value: function saveAll() {
                var _this7 = this;

                var changes = [];
                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                    for (var _iterator4 = this.translationTable.rows[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        var row = _step4.value;

                        var entryNewValue = row.options.entryInput.getValue();
                        var keyId = row.options.entry.key.id;
                        var entry = row.options.entry.entry;
                        var change = {};
                        if (entryNewValue === "" && !entry) {
                            continue;
                        }
                        if (entry && entryNewValue === entry.value) {
                            continue;
                        }
                        change = {
                            keyId: keyId,
                            newValue: entryNewValue,
                            languageId: this.language.id
                        };
                        if (entry) {
                            change.entryId = entry.id;
                        }
                        changes.push(change);
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

                var request = {
                    csrfmiddlewaretoken: CSRF_TOKEN,
                    editEntries: JSON.stringify(changes)
                };
                ajaxCall(request, function () {
                    // TODO: Find a way to redraw only the changed rows
                    _this7.redraw();
                }, function () {
                    _this7.saveAllButton.disable();
                    _this7.saveAllButton.setLevel(_UI.UI.Level.ERROR);
                    _this7.saveAllButton.setLabel("Failed!");
                    setTimeout(function () {
                        _this7.saveAllButton.enable();
                        _this7.redraw();
                    }, 1000);
                });
            }
        }, {
            key: "importFromFile",
            value: function importFromFile() {
                var _this8 = this;

                this.uploadFile.node.onchange = function () {
                    var reader = new FileReader();
                    var file = _this8.uploadFile.getFile();
                    if (file.size > 1e8) {
                        _this8.fileWarningModal.show();
                        console.warn("File ", file.name, " too large. Skipping upload.");
                        _this8.uploadFile.setValue("");
                        return;
                    }
                    reader.onprogress = function () {
                        _this8.importButton.setLevel(_UI.UI.Level.WARNING);
                        _this8.importButton.setLabel("Uploading...");
                        _this8.importButton.disable();

                        _this8.saveAllButton.disable();
                        var _iteratorNormalCompletion5 = true;
                        var _didIteratorError5 = false;
                        var _iteratorError5 = undefined;

                        try {
                            for (var _iterator5 = _this8.translationTable.rows[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                                var row = _step5.value;

                                row.options.saveButton.disable();
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
                    };
                    reader.onload = function (e) {
                        var text = e.currentTarget.result;
                        var error = false;
                        var errmsg = "";
                        try {
                            var obj = JSON.parse(text);
                            if (Object.prototype.toString.call(obj) !== '[object Array]') {
                                error = true;
                                errmsg = "No array found!";
                            } else {
                                var changes = [];
                                var _iteratorNormalCompletion6 = true;
                                var _didIteratorError6 = false;
                                var _iteratorError6 = undefined;

                                try {
                                    for (var _iterator6 = obj[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                                        var x = _step6.value;

                                        if (!x.keyId) {
                                            error = true;
                                            errmsg = "Key id missing!";
                                            break;
                                        }
                                        if (x.entryValue === "") {
                                            continue;
                                        }
                                        if (!x.entryValue) {
                                            error = true;
                                            errmsg = "Entry value missing!";
                                            break;
                                        }
                                        x.entryValue = x.entryValue.trim();
                                        var change = {
                                            keyId: x.keyId,
                                            newValue: x.entryValue,
                                            languageId: _this8.language.id
                                        };
                                        if (x.entryId) {
                                            change.entryId = x.entryId;
                                            var entry = _TranslationStore.TranslationEntryStore.get(x.entryId);
                                            if (x.entryValue === entry.value) {
                                                continue;
                                            }
                                        }
                                        changes.push(change);
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

                                if (!error) {
                                    var request = {
                                        csrfmiddlewaretoken: CSRF_TOKEN,
                                        editEntries: JSON.stringify(changes)
                                    };
                                    ajaxCall(request, function () {
                                        _this8.redraw();
                                    });
                                }
                            }
                        } catch (ex) {
                            error = true;
                            errmsg = ex.message;
                        }

                        var timeout = void 0;
                        if (error) {
                            _this8.importButton.setLevel(_UI.UI.Level.ERROR);
                            _this8.importButton.setLabel(errmsg);
                            timeout = 2000;
                        } else {
                            _this8.importButton.setLevel(_UI.UI.Level.SUCCESS);
                            _this8.importButton.setLabel("Successfully uploaded!");
                            timeout = 700;
                        }
                        setTimeout(function () {
                            _this8.importButton.enable();
                            _this8.importButton.setLevel(_UI.UI.Level.INFO);
                            _this8.importButton.setLabel("Import");

                            _this8.saveAllButton.enable();
                            var _iteratorNormalCompletion7 = true;
                            var _didIteratorError7 = false;
                            var _iteratorError7 = undefined;

                            try {
                                for (var _iterator7 = _this8.translationTable.rows[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                                    var row = _step7.value;

                                    row.options.saveButton.enable();
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
                        }, timeout);
                        _this8.uploadFile.setValue("");
                    };
                    reader.readAsText(file);
                };
            }
        }, {
            key: "exportToFile",
            value: function exportToFile() {
                var language = this.language;
                var keyEntryMap = new Map();
                var _iteratorNormalCompletion8 = true;
                var _didIteratorError8 = false;
                var _iteratorError8 = undefined;

                try {
                    for (var _iterator8 = _TranslationStore.TranslationEntryStore.all()[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                        var entry = _step8.value;

                        if (entry.getLanguage().id === language.id) {
                            keyEntryMap.set(entry.getTranslationKey().id, entry);
                        }
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

                var output = [];
                var _iteratorNormalCompletion9 = true;
                var _didIteratorError9 = false;
                var _iteratorError9 = undefined;

                try {
                    for (var _iterator9 = _TranslationStore.TranslationKeyStore.all()[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                        var key = _step9.value;

                        var _entry = keyEntryMap.get(key.id);
                        output.push({
                            keyId: key.id,
                            entryId: _entry ? _entry.id : "",
                            keyValue: key.value,
                            entryValue: _entry ? _entry.value : ""
                        });
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

                var file = new Blob([JSON.stringify(output, null, 2)], { type: 'text/plain;charset=utf-8' });

                (0, _FileSaver2.default)(file, "translations.json");
            }
        }]);

        return TranslationEntryManager;
    }(_UI.UI.Panel);

    var TranslationKeyTableRow = function (_UI$TableRow2) {
        _inherits(TranslationKeyTableRow, _UI$TableRow2);

        function TranslationKeyTableRow() {
            _classCallCheck(this, TranslationKeyTableRow);

            return _possibleConstructorReturn(this, (TranslationKeyTableRow.__proto__ || Object.getPrototypeOf(TranslationKeyTableRow)).apply(this, arguments));
        }

        _createClass(TranslationKeyTableRow, [{
            key: "setOptions",
            value: function setOptions(options) {
                _get(TranslationKeyTableRow.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyTableRow.prototype), "setOptions", this).call(this, options);
            }
        }, {
            key: "onMount",
            value: function onMount() {
                var _this10 = this;

                _get(TranslationKeyTableRow.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyTableRow.prototype), "onMount", this).call(this);
                this.deleteButton.addClickListener(function () {
                    _this10.deleteKey();
                });
                this.renameButton.addClickListener(function () {
                    _this10.rename();
                });
            }
        }, {
            key: "redraw",
            value: function redraw() {
                _get(TranslationKeyTableRow.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyTableRow.prototype), "redraw", this).call(this);
                this.textInput.hide();
                this.renameState = false;

                var editable = this.options.entry.editable;
                if (!editable) {
                    this.renameButton.hide();
                    this.deleteButton.hide();
                } else {
                    this.renameButton.show();
                    this.deleteButton.show();
                }
            }
        }, {
            key: "deleteKey",
            value: function deleteKey() {
                var _this11 = this;

                var key = this.options.entry.key;
                var table = this.options.entry.table;
                var request = {
                    csrfmiddlewaretoken: CSRF_TOKEN,
                    editKeys: JSON.stringify({
                        type: "delete",
                        keyId: key.id
                    })
                };
                table.changed = true;
                this.hide();
                ajaxCall(request, function () {
                    _this11.options.entry.table.changed = true;
                    _TranslationStore.TranslationKeyStore.applyDeleteEvent({ objectId: key.id });
                    var _iteratorNormalCompletion10 = true;
                    var _didIteratorError10 = false;
                    var _iteratorError10 = undefined;

                    try {
                        for (var _iterator10 = _TranslationStore.TranslationEntryStore.all()[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                            var entry = _step10.value;

                            if (entry.translationKeyId == key.id) {
                                _TranslationStore.TranslationEntryStore.applyDeleteEvent({ objectId: entry.id });
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
                });
            }
        }, {
            key: "rename",
            value: function rename() {
                var _this12 = this;

                if (!this.renameState) {
                    this.renameButton.setLabel("Save");
                    this.textInput.setValue(this.textElement.getValue());
                    this.oldTextElementValue = this.textElement.getValue();
                    this.textElement.setValue("");
                    this.textInput.show();
                    this.renameState = true;
                } else {
                    this.renameButton.setLabel("Rename");
                    this.textInput.hide();
                    if (this.textInput.getValue() != "") {
                        this.textElement.setValue(this.textInput.getValue());

                        var value = this.textInput.getValue();
                        var key = this.options.entry.key;
                        var request = {
                            csrfmiddlewaretoken: CSRF_TOKEN,
                            editKeys: JSON.stringify({
                                type: "rename",
                                keyId: key.id,
                                newValue: value
                            })
                        };
                        ajaxCall(request, function () {
                            _this12.options.entry.table.changed = true;
                            _this12.options.entry.table.redraw();
                        });
                    } else {
                        this.textElement.setValue(this.oldTextElementValue);
                    }
                    this.renameState = false;
                }
            }
        }]);

        return TranslationKeyTableRow;
    }(_UI.UI.TableRow);

    var TranslationKeyTable = function (_UI$Table2) {
        _inherits(TranslationKeyTable, _UI$Table2);

        function TranslationKeyTable() {
            _classCallCheck(this, TranslationKeyTable);

            return _possibleConstructorReturn(this, (TranslationKeyTable.__proto__ || Object.getPrototypeOf(TranslationKeyTable)).apply(this, arguments));
        }

        _createClass(TranslationKeyTable, [{
            key: "setOptions",
            value: function setOptions(options) {
                _get(TranslationKeyTable.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyTable.prototype), "setOptions", this).call(this, options);
                this.editable = false;
            }
        }, {
            key: "getRowClass",
            value: function getRowClass() {
                return TranslationKeyTableRow;
            }
        }, {
            key: "setColumns",
            value: function setColumns() {
                var numberStyle = {
                    textAlign: "right"
                };

                _get(TranslationKeyTable.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyTable.prototype), "setColumns", this).call(this, [{
                    value: function value(entry) {
                        return entry.key.id;
                    },
                    headerName: "Key ID",
                    sortDescending: true,
                    cellStyle: numberStyle,
                    headerStyle: numberStyle
                }, {
                    value: function value(entry) {
                        return [_UI.UI.createElement(_UI.UI.TextElement, { ref: "textElement", value: entry.key.value }), _UI.UI.createElement(_UI.UI.TextInput, { ref: "textInput" })];
                    },
                    headerName: "Entry value",
                    sortDescending: true,
                    cellStyle: numberStyle,
                    headerStyle: numberStyle
                }, {
                    value: function value(entry) {
                        return [_UI.UI.createElement(
                            "div",
                            { className: "btn-group" },
                            _UI.UI.createElement(_UI.UI.Button, { ref: "renameButton", label: "Rename", level: _UI.UI.Level.INFO }),
                            _UI.UI.createElement(_UI.UI.Button, { ref: "deleteButton", label: "Delete", level: _UI.UI.Level.DANGER })
                        )];
                    },
                    headerName: "Actions",
                    sortDescending: true
                }]);
            }
        }, {
            key: "onMount",
            value: function onMount() {
                _get(TranslationKeyTable.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyTable.prototype), "onMount", this).call(this);
                this.changed = false;
            }
        }, {
            key: "getEntryKey",
            value: function getEntryKey(entry, index) {
                return index;
            }
        }, {
            key: "getEntries",
            value: function getEntries() {
                var ret = [];
                var _iteratorNormalCompletion11 = true;
                var _didIteratorError11 = false;
                var _iteratorError11 = undefined;

                try {
                    for (var _iterator11 = _TranslationStore.TranslationKeyStore.all()[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                        var key = _step11.value;

                        ret.push({ key: key, table: this, editable: this.editable });
                    }
                } catch (err) {
                    _didIteratorError11 = true;
                    _iteratorError11 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion11 && _iterator11.return) {
                            _iterator11.return();
                        }
                    } finally {
                        if (_didIteratorError11) {
                            throw _iteratorError11;
                        }
                    }
                }

                return ret;
            }
        }, {
            key: "makeEditable",
            value: function makeEditable() {
                this.editable = true;
                this.redraw();
            }
        }, {
            key: "makeNoneditable",
            value: function makeNoneditable() {
                this.editable = false;
                this.redraw();
            }
        }]);

        return TranslationKeyTable;
    }(_UI.UI.Table);

    var TranslationKeyManager = function (_UI$Panel2) {
        _inherits(TranslationKeyManager, _UI$Panel2);

        function TranslationKeyManager() {
            _classCallCheck(this, TranslationKeyManager);

            return _possibleConstructorReturn(this, (TranslationKeyManager.__proto__ || Object.getPrototypeOf(TranslationKeyManager)).apply(this, arguments));
        }

        _createClass(TranslationKeyManager, [{
            key: "render",
            value: function render() {
                var style = {
                    display: "inline-block",
                    overflow: "auto",
                    resize: "none",
                    height: "46px",
                    width: "300px",
                    "vertical-align": "top"
                };

                return [_UI.UI.createElement(
                    "label",
                    null,
                    "Enable editing: \xA0 "
                ), _UI.UI.createElement(_UI.UI.CheckboxInput, { ref: "editableCheckbox" }), _UI.UI.createElement(TranslationKeyTable, { ref: "table" }), _UI.UI.createElement(_UI.UI.TextArea, { ref: "textArea", className: "form-control", style: style }), _UI.UI.createElement(_UI.UI.Button, { label: "Add keys", ref: "saveButton", style: { marginLeft: "20px" }, level: _UI.UI.Level.INFO }), _UI.UI.createElement(_UI.UI.TextElement, { ref: "addStatus" })];
            }
        }, {
            key: "onMount",
            value: function onMount() {
                var _this15 = this;

                _get(TranslationKeyManager.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyManager.prototype), "onMount", this).call(this);
                this.changed = false;
                this.saveButton.addClickListener(function () {
                    _this15.saveKeys();
                });
                this.editableCheckbox.addClickListener(function () {
                    _this15.switchEditable();
                });
            }
        }, {
            key: "switchEditable",
            value: function switchEditable() {
                if (this.editableCheckbox.getValue()) {
                    this.table.makeEditable();
                } else {
                    this.table.makeNoneditable();
                }
            }
        }, {
            key: "hasChanged",
            value: function hasChanged() {
                return this.table.changed || this.changed;
            }
        }, {
            key: "setUnchanged",
            value: function setUnchanged() {
                this.table.changed = false;
                this.changed = false;
            }
        }, {
            key: "redraw",
            value: function redraw() {
                _get(TranslationKeyManager.prototype.__proto__ || Object.getPrototypeOf(TranslationKeyManager.prototype), "redraw", this).call(this);
            }
        }, {
            key: "saveKeys",
            value: function saveKeys() {
                var _this16 = this;

                var value = this.textArea.getValue();
                this.textArea.setValue("");

                var request = {
                    csrfmiddlewaretoken: CSRF_TOKEN,
                    editKeys: JSON.stringify({
                        type: "add",
                        keys: value
                    })
                };
                this.saveButton.disable();
                this.changed = true;
                ajaxCall(request, function (data) {
                    _this16.saveButton.setLabel("Success!");
                    _this16.saveButton.setLevel(_UI.UI.Level.SUCCESS);
                    _this16.textArea.setValue("");
                    _this16.changed = true;
                    _this16.addStatus.setValue(data.keyInfo.added + " keys added, " + data.keyInfo.alreadyExists + " keys already exists");
                    setTimeout(function () {
                        _this16.saveButton.enable();
                        _this16.saveButton.setLabel("Add keys");
                        _this16.saveButton.setLevel(_UI.UI.Level.INFO);
                        _this16.addStatus.setValue("");
                        _this16.table.redraw();
                    }, 2000);
                }, function () {
                    _this16.saveButton.setLabel("Failed!");
                    _this16.saveButton.setLevel(_UI.UI.Level.ERROR);
                    setTimeout(function () {
                        _this16.saveButton.enable();
                        _this16.saveButton.setLabel("Add keys");
                        _this16.saveButton.setLevel(_UI.UI.Level.INFO);
                    }, 700);
                });
            }
        }]);

        return TranslationKeyManager;
    }(_UI.UI.Panel);

    var TranslationManager = function (_UI$Panel3) {
        _inherits(TranslationManager, _UI$Panel3);

        function TranslationManager() {
            _classCallCheck(this, TranslationManager);

            return _possibleConstructorReturn(this, (TranslationManager.__proto__ || Object.getPrototypeOf(TranslationManager)).apply(this, arguments));
        }

        _createClass(TranslationManager, [{
            key: "render",
            value: function render() {
                return [_UI.UI.createElement(
                    _UI.UI.TabArea,
                    { ref: "tabArea", variableHeightPanels: true },
                    _UI.UI.createElement(TranslationKeyManager, { ref: "keyManager", tabHref: "#keys", title: "Edit keys", active: true }),
                    _UI.UI.createElement(TranslationEntryManager, { ref: "entryManager", tabHref: "#entries", title: "Edit entries" })
                )];
            }
        }, {
            key: "onMount",
            value: function onMount() {
                var _this18 = this;

                _get(TranslationManager.prototype.__proto__ || Object.getPrototypeOf(TranslationManager.prototype), "onMount", this).call(this);

                this.showUrlTab(_URLRouter.URLRouter.getLocation());
                _URLRouter.URLRouter.addRouteListener(function (location) {
                    return _this18.showUrlTab(location);
                });

                this.tabArea.titleArea.addClass("align-center");

                this.tabArea.children[1].addClickListener(function () {
                    if (_this18.keyManager.hasChanged()) {
                        _this18.entryManager.redraw();
                        _this18.keyManager.setUnchanged();
                    }
                });
            }
        }, {
            key: "showUrlTab",
            value: function showUrlTab(location) {
                if (location.args[0] === "keys") {
                    this.keyManager.dispatch("show");
                } else if (location.args[0] === "entries") {
                    this.entryManager.dispatch("show");
                    if (this.keyManager.hasChanged()) {
                        this.entryManager.redraw();
                        this.keyManager.setUnchanged();
                    }
                } else {
                    this.keyManager.dispatch("show");
                }
            }
        }]);

        return TranslationManager;
    }(_UI.UI.Panel);

    exports.TranslationManager = TranslationManager;
});
