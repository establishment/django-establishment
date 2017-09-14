import {Ajax} from "base/Ajax";
import {CallThrottler} from "base/Utils";
import {UI, Switcher, Level, Button, registerStyle, StyleSheet, styleRule,
        Form, TextArea, TextInput, RadioInput, CheckboxInput, Modal, ActionModalButton} from "ui/UI";
import {StateDependentElement} from "ui/StateDependentElement";
import {MarkupRenderer} from "markup/MarkupRenderer";

import {QuestionnaireStore, QuestionnaireQuestion, QuestionnaireInstanceStore} from "./state/QuestionnaireStore";


export class QuestionnaireStyle extends StyleSheet {
    @styleRule
    footer = {
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    };

    @styleRule
    questionPage = {
        padding: "30px"
    };

    @styleRule
    questionTextArea = {
        fontSize: "1.2em",
        minHeight: "60px"
    };

    @styleRule
    questionAnswerArea = {
        marginTop: "10px"
    };

    @styleRule
    form = {
        width: "100%"
    };

    @styleRule
    textArea = {
        width: "100%",
        minHeight: "100px"
    };

    @styleRule
    radioInputContainer = {

    };

    @styleRule
    finished = {
        fontSize: "1.5em",
        alignItems: "center",
        height: "250px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center"
    };

    @styleRule
    otherInput = {
        outline: 0,
        border: 0,
        minWidth: "220px",
        borderBottom: "1px solid #eee",
        marginLeft: "5px",
        transition: "0.4s",
        ":focus": {
            transition: "0.4s",
            borderBottom: "1px solid #777"
        },
        ":hover": {
            transition: "0.4s",
            borderBottom: "1px solid #777"
        }
    };

    @styleRule
    markup = {
        display: "inline-block",
        " p": {
            margin: 0
        }
    };
}


@registerStyle(QuestionnaireStyle)
export class QuestionPage extends UI.Element {
    getDefaultOptions() {
        return {
            editable: true
        };
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.questionPage);
    }

    isPlainText() {
        return this.options.question.type === QuestionnaireQuestion.Type.PLAIN_TEXT;
    }

    isSingleChoice() {
        return this.options.question.type === QuestionnaireQuestion.Type.SINGLE_CHOICE;
    }

    isMultipleChoice() {
        return this.options.question.type === QuestionnaireQuestion.Type.MULTIPLE_CHOICE;
    }

    getForm() {
        let formFields;
        let InputType;
        if (this.isSingleChoice()) {
            InputType = RadioInput;
        }
        if (this.isMultipleChoice()) {
            InputType = CheckboxInput;
        }
        if (!this.isPlainText()) {
            formFields = this.options.question.getOptions().map(
                option => <div className={this.styleSheet.radioInputContainer}>
                            <InputType ref={"option" + option.id} name={this.options.question.id}
                                        checked={this.isChecked(option)} disabled={!this.options.editable} />
                            <MarkupRenderer value={option.answer} className={this.styleSheet.markup}/>
                          </div>
            );
            if (this.options.question.otherChoice) {
                formFields.push(
                    <div className={this.styleSheet.radioInputContainer}>
                        <InputType ref="otherChoice" name={this.options.question.id}
                                    checked={this.isOtherChoice()} disabled={!this.options.editable} />
                        Other: <TextInput   ref="textArea" value={this.getTextValue()}
                                            className={this.styleSheet.otherInput} readOnly={!this.options.editable}/>
                    </div>
                );
            }
        } else {
            formFields = [
                <TextArea className={this.styleSheet.textArea} value={this.getTextValue()}
                          ref="textArea" readOnly={!this.options.editable}/>
            ];
        }
        return <Form className={this.styleSheet.form}>{formFields}</Form>
    }

    getResponse() {
        if (this.options.instance) {
            return this.options.instance.getQuestionResponse(this.options.question.id);
        }
        return this.options.question.getCurrentUserResponse();
    }

    isChecked(questionOption) {
        const userResponse = this.getResponse();
        return (userResponse && userResponse.choiceIds.indexOf(questionOption.id) >= 0) || false;
    }

    isOtherChoice() {
        const userResponse = this.getResponse();
        return (userResponse && (userResponse.choiceIds.length === 0 || this.isMultipleChoice()) && userResponse.text);
    }

    getTextValue() {
        const userResponse = this.getResponse();
        return (userResponse && userResponse.text) || "";
    }

    render() {
        return [
            <div className={this.styleSheet.questionTextArea}>
                <MarkupRenderer value={this.options.question.text} className={this.styleSheet.markup} />
            </div>,
            <div className={this.styleSheet.questionAnswerArea}>
                {this.getForm()}
            </div>
        ];
    }

    getResponseData() {
        let response = {
            questionnaireId: this.options.question.questionnaireId,
            questionId: this.options.question.id
        };
        if (this.isPlainText() || this.options.question.otherChoice) {
            if (this.textArea.getValue()) {
                response.text = this.textArea.getValue();
            }
        }
        if (!this.isPlainText()) {
            let choiceIds = [];
            for (const option of this.options.question.getOptions()) {
                if (this["option" + option.id].getValue()) {
                    choiceIds.push(option.id);
                }
            }
            if (choiceIds.length) {
                response.choiceIds = choiceIds;
            }
        }
        return response;
    }

    sendResponse() {
        this.ajaxThrottler = this.ajaxThrottler || new CallThrottler({throttle: 3000, debounce: 500});
        this.ajaxThrottler.wrap(
            () => Ajax.postJSON("/questionnaire_answer/", this.getResponseData()).then(
                      () => this.options.panel.dispatch("updateFooter", false)
                  )
        )();

    }

    onMount() {
        if (!this.options.editable) {
            return;
        }
        if (!this.isPlainText()) {
            for (const option of this.options.question.getOptions()) {
                this["option" + option.id].addChangeListener(() => this.sendResponse());
            }
            if (this.options.question.otherChoice) {
                this.otherChoice.addChangeListener(() => this.sendResponse());
            }
        }
        if (this.isPlainText() || this.options.question.otherChoice) {
            this.textArea.addNodeListener("input", () => this.sendResponse());
        }
    }
}


class OrderedChildrenSwitcher extends Switcher {
    constructor() {
        super(...arguments);
        this.childIndex = 0;
    }

    getChildIndex() {
        return this.childIndex;
    }

    isFirstChild() {
        return this.getChildIndex() === 0;
    }

    isLastChild() {
        return this.getChildIndex() === this.options.children.length - 1;
    }

    updateChildIndex(delta) {
        const newChildIndex = this.childIndex + delta;
        if (0 <= newChildIndex && newChildIndex < this.options.children.length) {
            this.childIndex = newChildIndex;
            this.setActive(this.options.children[this.childIndex]);
        }
    }
}


@registerStyle(QuestionnaireStyle)
export class QuestionnairePanel extends UI.Element {
    getQuestionnaire() {
        return QuestionnaireStore.get(this.options.questionnaireId);
    }

    getQuestions() {
        return this.getQuestionnaire().getQuestions();
    }

    render() {
        const questions = this.getQuestions();
        return [
            <OrderedChildrenSwitcher ref="questionPageSwitcher" style={{minHeight: "300px"}}>
                {questions.map(question => <QuestionPage question={question} panel={this}/>)}
            </OrderedChildrenSwitcher>,
            <div className={this.styleSheet.footer}>
                <div>
                    <Button level={Level.PRIMARY} faIcon="arrow-left" ref="backButton" />
                </div>
                <div ref="progressArea" />
                <div>
                    <Button level={Level.PRIMARY} faIcon="arrow-right" ref="forwardButton" />
                </div>
            </div>
        ];
    }

    finish() {
        Ajax.postJSON("/questionnaire_submit/", {
            questionnaireId: this.options.questionnaireId
        });
        this.dispatch("finished");
        (this.parent instanceof DelayedQuestionnairePanel) && this.parent.dispatch("finished");
    }

    updateFooter() {
        this.backButton.setStyle("visibility", this.questionPageSwitcher.isFirstChild() ? "hidden" : "initial");

        const isLastPage = this.questionPageSwitcher.isLastChild();
        this.forwardButton.setStyle("visibility", isLastPage ? "hidden" : "initial");

        const currentQuestion = this.getQuestions()[this.questionPageSwitcher.childIndex];
        if (currentQuestion.getCurrentUserResponse()) {
            this.forwardButton.updateOptions({faIcon: "arrow-right", label: ""});
        } else {
            this.forwardButton.updateOptions({faIcon: "", label: UI.T("Skip")});
        }

        if (isLastPage) {
            this.progressArea.setChildren([
                <Button onClick={() => this.finish()} level={Level.PRIMARY}>{UI.T("Finish")}</Button>
            ]);
        } else {
            this.progressArea.setChildren([
                <div style={{fontSize: "1.3em"}}>
                    {(this.questionPageSwitcher.getChildIndex() + 1).toString() + "/" + this.getQuestions().length}
                </div>
            ]);
        }
    }

    onMount() {
        this.updateFooter();
        this.backButton.addClickListener(() => {
            this.questionPageSwitcher.updateChildIndex(-1);
            this.updateFooter();
        });
        this.forwardButton.addClickListener(() => {
            this.questionPageSwitcher.updateChildIndex(1);
            this.updateFooter();
        });
        this.addListener("updateFooter", () => {
            this.updateFooter();
        });
    }
}


@registerStyle(QuestionnaireStyle)
export class DelayedQuestionnairePanel extends UI.Element {
    isFinished() {
        return !!QuestionnaireInstanceStore.getCurrentUserInstance(this.options.questionnaireId).dateSubmitted;
    }

    render() {
        if (this.options.error) {
            return StateDependentElement.renderError(this.options.error);
        }
        if (!this.options.loaded) {
            return StateDependentElement.renderLoading();
        }
        // if (this.isFinished()) {
        //     return <div className={this.styleSheet.finished}>
        //                 <div>
        //                     {UI.T("We have received your answer for this form.")}
        //                 </div>
        //                 <div>
        //                     {UI.T("Thank you!")}
        //                 </div>
        //            </div>;
        // }
        return <QuestionnairePanel questionnaireId={this.options.questionnaireId}/>
    }

    onMount() {
        Ajax.postJSON("/questionnaire_state/", {
            questionnaireId: this.options.questionnaireId
        }).then(
            () => this.updateOptions({loaded: true}),
            (error) => this.updateOptions({error})
        );
    }
}


export class QuestionnaireModal extends Modal {
    render() {
        return <DelayedQuestionnairePanel questionnaireId={this.options.questionnaireId} ref="questionnairePanel"/>;
    }

    onMount() {
        super.onMount();
        this.questionnairePanel.addListener("finished", () => this.hide());
    }
}


export class QuestionnaireButton extends ActionModalButton(QuestionnaireModal) {
    getDefaultOptions() {
        return {
            level: Level.PRIMARY,
            label: UI.T("Open Questionnaire")
        }
    }

    getModalOptions() {
        return {
            questionnaireId: this.options.questionnaireId
        };
    }
}
