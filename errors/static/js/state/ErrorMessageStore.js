define(["exports", "GlobalState", "TranslationStore"], function (exports, _GlobalState, _TranslationStore) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.ErrorMessage = exports.ErrorMessageStore = undefined;

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

    var ErrorMessage = function (_StoreObject) {
        _inherits(ErrorMessage, _StoreObject);

        function ErrorMessage() {
            _classCallCheck(this, ErrorMessage);

            return _possibleConstructorReturn(this, (ErrorMessage.__proto__ || Object.getPrototypeOf(ErrorMessage)).apply(this, arguments));
        }

        _createClass(ErrorMessage, [{
            key: "getTranslation",
            value: function getTranslation() {
                var translationKey = _TranslationStore.TranslationKeyStore.get(this.translationKeyId);
            }
        }]);

        return ErrorMessage;
    }(_GlobalState.StoreObject);

    var ErrorMessageStoreClass = function (_GenericObjectStore) {
        _inherits(ErrorMessageStoreClass, _GenericObjectStore);

        function ErrorMessageStoreClass() {
            _classCallCheck(this, ErrorMessageStoreClass);

            return _possibleConstructorReturn(this, (ErrorMessageStoreClass.__proto__ || Object.getPrototypeOf(ErrorMessageStoreClass)).call(this, "ErrorMessage", ErrorMessage));
        }

        return ErrorMessageStoreClass;
    }(_GlobalState.GenericObjectStore);

    var ErrorMessageStore = new ErrorMessageStoreClass();

    exports.ErrorMessageStore = ErrorMessageStore;
    exports.ErrorMessage = ErrorMessage;
});
