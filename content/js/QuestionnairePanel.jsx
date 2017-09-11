import {UI, Switcher, Level, Button, registerStyle, StyleSheet, styleRule, Form, TextArea, RadioInput} from "UI";
import {Ajax} from "Ajax";
import {StateDependentElement} from "StateDependentElement";

import {QuestionnaireStore, QuestionnaireQuestion, QuestionnaireInstanceStore} from "./state/QuestionnaireStore";


class QuestionnaireStyle extends StyleSheet {
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

    getForm() {
        let formFields;
        if (this.options.question.type === QuestionnaireQuestion.Type.MULTIPLE_CHOICE) {
            formFields = this.options.question.getOptions().map(
                option => <div className={this.styleSheet.radioInputContainer}>
                            <RadioInput ref={"option" + option.id} name={this.options.question.id}
                                        checked={this.isChecked(option)} disabled={!this.options.editable} />
                            {option.answer}
                          </div>
            )
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
        return (userResponse && userResponse.choiceId === questionOption.id) || false;
    }

    getTextValue() {
        const userResponse = this.getResponse();
        return (userResponse && userResponse.text) || "";
    }

    render() {
        return [
            <div className={this.styleSheet.questionTextArea}>
                {this.options.question.text}
            </div>,
            <div className={this.styleSheet.questionAnswerArea}>
                {this.getForm()}
            </div>
        ];
    }

    getBaseRequest() {
        return {
            questionnaireId: this.options.question.questionnaireId,
            questionId: this.options.question.id
        };
    }

    onMount() {
        if (!this.options.editable) {
            return;
        }
        if (this.options.question.type === QuestionnaireQuestion.Type.MULTIPLE_CHOICE) {
            for (const option of this.options.question.getOptions()) {
                this["option" + option.id].addChangeListener(() => {
                    Ajax.postJSON("/questionnaire_answer/", Object.assign({
                        choiceId: option.id
                    }, this.getBaseRequest()));
                });
            }
        } else {
            this.textArea.addNodeListener("input", () => {
                Ajax.postJSON("/questionnaire_answer/", Object.assign({
                    text: this.textArea.getValue()
                }, this.getBaseRequest()));
            })
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
                {questions.map(question => <QuestionPage question={question} />)}
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
        }).then(() => (this.parent instanceof DelayedQuestionnairePanel) && this.parent.redraw());
    }

    updateFooter() {
        this.backButton.setStyle("visibility", this.questionPageSwitcher.isFirstChild() ? "hidden" : "initial");

        const isLastPage = this.questionPageSwitcher.isLastChild();
        this.forwardButton.setStyle("visibility", isLastPage ? "hidden" : "initial");

        if (isLastPage) {
            this.progressArea.setChildren([
                <Button onClick={() => this.finish()} level={Level.PRIMARY}>{UI.T("Submit")}</Button>
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
        if (this.isFinished()) {
            return <div className={this.styleSheet.finished}>
                        <div>
                            {UI.T("We have received your answer for this form.")}
                        </div>
                        <div>
                            {UI.T("Thank you!")}
                        </div>
                   </div>;
        }
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
