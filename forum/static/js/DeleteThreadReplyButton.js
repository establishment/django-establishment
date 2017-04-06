import { UI } from "UI";

var DeleteThreadReplyModal = function (_UI$ActionModal) {
    babelHelpers.inherits(DeleteThreadReplyModal, _UI$ActionModal);

    function DeleteThreadReplyModal() {
        babelHelpers.classCallCheck(this, DeleteThreadReplyModal);
        return babelHelpers.possibleConstructorReturn(this, (DeleteThreadReplyModal.__proto__ || Object.getPrototypeOf(DeleteThreadReplyModal)).apply(this, arguments));
    }

    babelHelpers.createClass(DeleteThreadReplyModal, [{
        key: "getTitle",
        value: function getTitle() {
            return UI.T("Delete message");
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
                UI.T("Are you sure you want to delete the message?")
            );
        }
    }, {
        key: "action",
        value: function action() {
            this.options.messageInstance.deleteMessage();
            this.hide();
        }
    }]);
    return DeleteThreadReplyModal;
}(UI.ActionModal);

var DeleteThreadReplyButton = UI.ActionModalButton(DeleteThreadReplyModal);

export { DeleteThreadReplyButton };
