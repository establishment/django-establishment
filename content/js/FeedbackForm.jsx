import {
    UI,
    StyleSheet,
    styleRule,
    registerStyle,
    Form,
    Input,
    EmailInput,
    TextArea,
    SubmitInput,
} from "UI";
import {Ajax} from "Ajax";
import {enhance} from "Color";


export class FeedbackFormStyle extends StyleSheet {
    feedbackFormWidth = 720;
    marginBottom = 10;
    padding = 15;
    width = 300;
    inputHeight = 35;

    @styleRule
    feedbackForm = {
        width: () => this.feedbackFormWidth,
        maxWidth: "100%",
        margin: "0 auto",
    };

    @styleRule
    container = {
        display: "flex",
        flexDirection: "column",
    };

    @styleRule
    feedback = {

    };

    @styleRule
    nameAndEmailContainer = {
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
    };

    @styleRule
    field = {
        display: "flex",
        width: "50%",
        flex: "1",
        flexDirection: "column",
        padding: "0 10px",
        width: "100%",
        minWidth: "240px",
    };

    @styleRule
    textAreaField = {
        maxWidth: "100%",
        width: "100%",
        padding: "0 10px",
    };

    @styleRule
    label = {
        display: "block",
        fontSize: "18px",
        marginBottom: this.marginBottom,
        fontWeight: "600",
    };

    @styleRule
    input = {
        borderRadius: "0px !important",
        height: this.inputHeight,
        lineHeight: this.inputHeight,
        fontSize: "16px",
        paddingLeft: this.padding,
        marginBottom: this.marginBottom,
        letterSpacing: "0.2px",
        border: "0",
        border: "2px solid #ddd",
        transition: "0.25s",
        display: "flex",
        width: "100%",
        flex: "1",

        outline: "0",
        ":focus": {
            border: `2px solid ${enhance(this.themeProperties.COLOR_PRIMARY, 0.3)}`,
            transition: "0.25s",
        },
        ":hover": {
            border: `2px solid ${enhance(this.themeProperties.COLOR_PRIMARY, 0.3)}`,
            transition: "0.25s",
        },
        ":active": {
            border: `2px solid ${enhance(this.themeProperties.COLOR_PRIMARY, 0.3)}`,
            transition: "0.25s",
        },
    };

    @styleRule
    contactTextArea = {
        height: "175px",
        lineHeight: "initial",
        padding: this.padding,
        maxWidth: "100%",
        width: "100%",
    };

    @styleRule
    submitInput = {
        margin: "0 10px",
        marginTop: "20px",
        padding: "5px 15px",
        fontSize: "18px",
        backgroundColor: "#fff",
        border: "0",
        border: "2px solid #ddd",
        fontWeight: "600",
        transition: "0.25s",

        ":hover": {
            borderColor: enhance(this.themeProperties.COLOR_PRIMARY, 0.3),
            transition: "0.25s",
        },
        ":focus": {
            borderColor: enhance(this.themeProperties.COLOR_PRIMARY, 0.3),
            transition: "0.25s",
            outline: "0",
        },
    };

    @styleRule
    submitInputSending = {
        borderColor: enhance(this.themeProperties.COLOR_WARNING, 0.3),
        ":hover": {
            borderColor: enhance(this.themeProperties.COLOR_WARNING, 0.3),
        },
    };

    @styleRule
    submitInputSuccess = {
        borderColor: enhance(this.themeProperties.COLOR_SUCCESS, 0.3),
        ":hover": {
            borderColor: enhance(this.themeProperties.COLOR_SUCCESS, 0.3),
        },
    };

    @styleRule
    submitInputError = {
        borderColor: enhance(this.themeProperties.COLOR_DANGER, 0.3),
        ":hover": {
            borderColor: enhance(this.themeProperties.COLOR_DANGER, 0.3),
        },
    };
}


@registerStyle(FeedbackFormStyle)
export class FeedbackForm extends UI.Element {
    getDefaultOptions(options) {
        return {
            formState: 0,
        }
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.feedbackForm);
    }

    isDisabled() {
        return this.options.formState > 0;
    }

    setFormState(value) {
        this.options.formState = value;
        this.redraw();
    }

    getButtonAttributes() {
        const {formState} = this.options;
        const defaultClassName = this.styleSheet.submitInput;

        if (formState === 0) {
            return {
                value: "Submit",
                className: defaultClassName,
            };
        }
        if (formState === 1) {
            return {
                value: "Sending...",
                className: defaultClassName + this.styleSheet.submitInputSending,
            };
        }
        if (formState === 2) {
            return {
                value: "Thank you!",
                className: defaultClassName + this.styleSheet.submitInputSuccess,
            };
        }
        return {
            value: "Sorry, you exceeded your quota of sending feedbacks",
            className: defaultClassName + this.styleSheet.submitInputError,
        };
    }

    render() {
        return [
            <Form ref="feedbackForm" className={this.styleSheet.container}>
                <div className={this.styleSheet.nameAndEmailContainer}>
                    {
                        !USER.isAuthenticated ?
                        [
                            <div className={this.styleSheet.field}>
                                <label className={this.styleSheet.label}>
                                    Name
                                </label>
                                <Input ref="nameInput"
                                       className={this.styleSheet.input}
                                       disabled={this.isDisabled()} />
                            </div>,
                            <div className={this.styleSheet.field}>
                                <label className={this.styleSheet.label}>
                                    Email
                                </label>
                                <EmailInput ref="emailInput"
                                            className={this.styleSheet.input}
                                            disabled={this.isDisabled()} />
                            </div>
                        ] : null
                    }
                </div>
                <div className={this.styleSheet.textAreaField}>
                    <label className={this.styleSheet.label}>
                        Message
                    </label>
                    <TextArea ref="messageInput"
                              className={this.styleSheet.input + this.styleSheet.contactTextArea}
                              disabled={this.isDisabled()} />
                </div>
                <SubmitInput {...this.getButtonAttributes()}
                             disabled={this.isDisabled()}
                             onClick={() => this.submitMessage()} />
            </Form>
        ];
    }

    submitMessage() {
        let data = {
            name: (this.nameInput && this.nameInput.getValue()) || null,
            email: (this.emailInput && this.emailInput.getValue()) || null,
            message: this.messageInput.getValue(),
        };

        this.setFormState(1); // Sending...

        Ajax.postJSON("/send_feedback/", data).then(
            () => {
                this.setFormState(2); // Thank you!
            },
            () => {
                this.setFormState(3); // Sorry, you already sent in the last 6 hours
            }
        );
    }
}
