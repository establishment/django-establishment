define(["exports", "UI", "markup/MarkupRenderer"], function (exports, _UI, _MarkupRenderer) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.MarkupEditor = undefined;

    var _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];

            for (var key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }

        return target;
    };

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

    var MarkupEditor = function (_Panel) {
        _inherits(MarkupEditor, _Panel);

        function MarkupEditor() {
            _classCallCheck(this, MarkupEditor);

            return _possibleConstructorReturn(this, (MarkupEditor.__proto__ || Object.getPrototypeOf(MarkupEditor)).apply(this, arguments));
        }

        _createClass(MarkupEditor, [{
            key: "setOptions",
            value: function setOptions(options) {
                _get(MarkupEditor.prototype.__proto__ || Object.getPrototypeOf(MarkupEditor.prototype), "setOptions", this).call(this, options);
                this.options.showButtons = typeof this.options.showButtons === "undefined" ? true : this.options.showButtons;
            }
        }, {
            key: "extraNodeAttributes",
            value: function extraNodeAttributes(attr) {
                _get(MarkupEditor.prototype.__proto__ || Object.getPrototypeOf(MarkupEditor.prototype), "extraNodeAttributes", this).call(this, attr);
                attr.setStyle("textAlign", "center");
            }
        }, {
            key: "getMarkupRenderer",
            value: function getMarkupRenderer() {
                var rendererOptions = {};
                if (this.options.classMap) {
                    rendererOptions.classMap = this.options.classMap;
                }
                return _UI.UI.createElement(_MarkupRenderer.MarkupRenderer, _extends({ ref: this.refLink("markupRenderer"), value: this.options.value, style: { height: "100%", overflow: "auto" } }, rendererOptions));
            }
        }, {
            key: "getEditor",
            value: function getEditor() {
                return _UI.UI.createElement(_UI.CodeEditor, { ref: "codeEditor", lineWrapping: true, style: { height: "100%" }, value: this.options.value, aceMode: "text" });
            }
        }, {
            key: "render",
            value: function render() {
                var panelStyle = { display: "inline-block", verticalAlign: "top", width: "50%", height: "100%", overflow: "auto" };
                var buttons = void 0;
                if (this.options.showButtons) {
                    buttons = _UI.UI.createElement(
                        _UI.UI.ButtonGroup,
                        null,
                        _UI.UI.createElement(_UI.Button, { ref: "toggleLeftButton", label: _UI.UI.T("Editor"), level: _UI.UI.Level.SUCCESS }),
                        _UI.UI.createElement(_UI.Button, { ref: "toggleRightButton", label: _UI.UI.T("Article"), level: _UI.UI.Level.SUCCESS })
                    );
                }

                return [buttons, _UI.UI.createElement(
                    _UI.SectionDivider,
                    { ref: "sectionDivider", orientation: _UI.UI.Orientation.HORIZONTAL,
                        style: { textAlign: "initial", height: "100%", width: "100%", display: "inline-block",
                            overflow: "hidden" } },
                    _UI.UI.createElement(
                        _UI.Panel,
                        { ref: "editorPanel", style: panelStyle },
                        this.getEditor()
                    ),
                    _UI.UI.createElement(
                        _UI.Panel,
                        { ref: "rendererPanel", style: panelStyle },
                        this.getMarkupRenderer()
                    )
                )];
            }
        }, {
            key: "updateValue",
            value: function updateValue(markup) {
                this.markupRenderer.setValue(markup);
                this.markupRenderer.redraw();
            }
        }, {
            key: "appendValue",
            value: function appendValue(markup) {
                var value = this.getValue();
                if (value) {
                    value += "\n";
                }
                value += markup;
                this.setValue(value);
                this.updateValue(value);
            }
        }, {
            key: "setEditorOptions",
            value: function setEditorOptions() {
                var _this2 = this;

                this.codeEditor.ace.setOption("indentedSoftWrap", false);
                this.codeEditor.ace.getSession().addEventListener("change", function (event) {
                    var markup = _this2.codeEditor.getValue();
                    try {
                        _this2.updateValue(markup);
                    } catch (e) {
                        console.error("Exception in parsing markup: ", e);
                    }
                });
            }
        }, {
            key: "onMount",
            value: function onMount() {
                var _this3 = this;

                if (this.options.showButtons) {
                    this.toggleLeftButton.addClickListener(function () {
                        if (_this3.editorPanel.getWidth() === 0) {
                            console.log("It is collapsed. It will expand.");
                            _this3.sectionDivider.expandChild(0);
                            _this3.toggleLeftButton.setLevel(_UI.UI.Level.SUCCESS);
                        } else {
                            console.log("It is expanded. It will collapse.");
                            _this3.sectionDivider.collapseChild(0);
                            _this3.toggleLeftButton.setLevel(_UI.UI.Level.DANGER);
                        }
                    });
                    this.toggleRightButton.addClickListener(function () {
                        if (_this3.rendererPanel.getWidth() === 0) {
                            _this3.sectionDivider.expandChild(1);
                            _this3.toggleRightButton.setLevel(_UI.UI.Level.SUCCESS);
                        } else {
                            _this3.sectionDivider.collapseChild(1);
                            _this3.toggleRightButton.setLevel(_UI.UI.Level.DANGER);
                        }
                    });
                }

                this.setEditorOptions();
            }
        }, {
            key: "getValue",
            value: function getValue() {
                return this.codeEditor.getValue();
            }
        }, {
            key: "setValue",
            value: function setValue(value) {
                return this.codeEditor.setValue(value);
            }
        }]);

        return MarkupEditor;
    }(_UI.Panel);

    exports.MarkupEditor = MarkupEditor;
});
