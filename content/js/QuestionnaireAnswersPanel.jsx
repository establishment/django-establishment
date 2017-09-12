import {UI, TabArea, Panel, Switcher, Theme, registerStyle, StyleSheet, styleRule, Level, RowList, CardPanel, Table} from "UI";
import {Ajax} from "base/Ajax";
import {StateDependentElement} from "ui/StateDependentElement";
import {UserHandle} from "UserHandle";
import {ColorGenerator} from "Color";

import {PieChartSVG} from "./charts/PieChart";
import {QuestionnaireStore, QuestionnaireQuestion} from "./state/QuestionnaireStore";
import {QuestionPage} from "./QuestionnairePanel";


class QuestionnaireAnswersStyle extends StyleSheet {
    @styleRule
    miniInstance = {
        padding: "5px",
        border: "1px solid #eee",
        cursor: "pointer"
    };

    @styleRule
    questionnaireResponseWidget = {
        display: "inline-flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative"
    };

    @styleRule
    responsesLeftSideContainer = {
        height: "100%",
        overflow: "auto",
        width: "150px",
        borderRight: "1px solid #ddd"
    };

    @styleRule
    responsesRightSide = {
        display: "inline-block",
        flex: "1",
        width: "calc(100% - 150px)",
        height: "100%",
        overflow: "auto"
    };
}


class QuestionSummary extends UI.Element {
    getInstanceResponse(instance) {
        return instance.getQuestionResponse(this.options.question.id);
    }

    isOtherResponse(response) {
        if (this.options.question.type === QuestionnaireQuestion.Type.SINGLE_CHOICE) {
            return (response.choiceIds || []).length === 0 && response.text;
        }
        return !!response.text;
    }

    getInstances() {
        return this.options.question.getQuestionnaire().getAllInstances().filter(
            instance => this.getInstanceResponse(instance)
        );
    }

    buildChoiceFrequencyMap() {
        let frequencyMap = new Map();
        for (const instance of this.getInstances()) {
            const instanceResponse = this.getInstanceResponse(instance);
            for (let choiceId of instanceResponse.choiceIds || []) {
                frequencyMap.set(choiceId, (frequencyMap.get(choiceId) || 0) + 1);
            }
            if (this.isOtherResponse(instanceResponse)) {
                frequencyMap.set(0, (frequencyMap.get(0) || 0) + 1);
            }
        }
        return frequencyMap;
    }

    getPieChart() {
        const frequencyMap = this.buildChoiceFrequencyMap();
        const options = this.options.question.getOptions();
        let sectorData = [];
        for (let i = 0; i < options.length; i += 1) {
            if (frequencyMap.get(options[i].id)) {
                sectorData.push({
                    size: frequencyMap.get(options[i].id),
                    color: ColorGenerator.getPersistentColor(i)
                });
            }
        }
        if (frequencyMap.get(0)) {
            sectorData.push({
                size: frequencyMap.get(0),
                color: ColorGenerator.getPersistentColor(options.length)
            });
        }
        return <PieChartSVG sectors={sectorData} />;
    }

    getColorList() {
        const frequencyMap = this.buildChoiceFrequencyMap();
        let options = this.options.question.getOptions();
        if (this.options.question.otherChoice) {
            options.push({id: 0, answer: "Other"});
        }
        return <Table entries={options}
                      columns={[
                          {value: option => option.answer, headerName: UI.T("Choice")},
                          {value: option => frequencyMap.get(option.id) || 0, headerName: UI.T("Votes")},
                          {value: (option, index) => <div style={{height: "20px", width: "20px", backgroundColor: ColorGenerator.getPersistentColor(index)}}/>,
                           headerName: UI.T("Color")}
                      ]} />;
    }
    
    render() {
        const question = this.options.question;
        let content;
        if (question.type === QuestionnaireQuestion.Type.PLAIN_TEXT) {
            content = <RowList  rows={this.getInstances()}
                                style={{maxHeight: "200px"}}
                                rowParser={
                                    instance => [
                                        <UserHandle userId={instance.userId} />,
                                        ": ",
                                        instance.getQuestionResponse(question.id).text
                                    ]
                                }/>;
        } else {
            content = [
                <div style={{display: "inline-block", height: "100%", width: "50%", textAlign: "center", float: "left"}}>
                    {this.getPieChart()}
                </div>,
                <div style={{display: "inline-block", height: "100%", width: "50%", float: "right"}}>
                    {this.getColorList()}
                </div>,
                <div style={{clear: "both"}} />
            ];
            const otherAnswers = this.getInstances().filter(instance => instance.getQuestionResponse(question.id).text);
            if (otherAnswers.length) {
                content.push(<h4 style={{marginRight: "10px"}}>Other answers:</h4>);
                content.push(<RowList  rows={otherAnswers}
                                style={{maxHeight: "200px", border: "1px solid black"}}
                                rowParser={
                                    instance => [
                                        <UserHandle userId={instance.userId} />,
                                        ": ",
                                        instance.getQuestionResponse(question.id).text
                                    ]
                                }/>)
            }
        }
        return <CardPanel level={Level.PRIMARY} title={question.text} headingCentered={false} style={{marginBottom: "10px", width: "80%", marginLeft: "10%"}}>
            {content}
        </CardPanel>;
    }
}


class QuestionnaireSummaryWidget extends UI.Element {
    getQuestionnaire() {
        return QuestionnaireStore.get(this.options.questionnaireId);
    }

    render() {
        return this.getQuestionnaire().getQuestions().map(
            question => <QuestionSummary question={question}/>
        );
    }
}


class QuestionnaireInstanceSwitcher extends Switcher {
    constructor() {
        super(...arguments);
        this.instanceMap = new Map();
        for (const instanceUIElement of this.options.children) {
            this.instanceMap.set(instanceUIElement.options.instance.id, instanceUIElement);
        }
    }

    switchToInstance(instance) {
        this.setActive(this.instanceMap.get(instance.id));
    }
}


class FullInstancePage extends UI.Element {
    render() {
        return this.options.instance.getQuestionnaire().getQuestions().map(
            question => <QuestionPage question={question} instance={this.options.instance}
                                      editable={false} style={{paddingBottom: 0}}/>
        );
    }
}


@registerStyle(QuestionnaireAnswersStyle)
class QuestionnaireResponsesWidget extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.questionnaireResponseWidget);
    }

    getQuestionnaire() {
        return QuestionnaireStore.get(this.options.questionnaireId);
    }

    switchToInstance(instance) {
        this.instanceSwitcher.switchToInstance(instance);

        const allInstances = this.getQuestionnaire().getAllInstances();
        for (const otherInstance of allInstances) {
            const obj = this["miniInstanceDiv" + otherInstance.id];
            if (instance === otherInstance) {
                obj.setStyle("background-color", Theme.Global.getProperty("COLOR_INFO", "#ddd"));
            } else {
                obj.setStyle("background-color", Theme.Global.getProperty("COLOR_DEFAULT", "#fff"));
            }
        }
    }

    render() {
        const allInstances = this.getQuestionnaire().getAllInstances();
        const miniResponses = allInstances.map(
            instance => <div onClick={() => this.switchToInstance(instance)} ref={"miniInstanceDiv" + instance.id}
                             className={this.styleSheet.miniInstance}>
                            <UserHandle disableClick userId={instance.userId}/>
                        </div>
        );
        const fullInstances = allInstances.map(
            instance => <FullInstancePage instance={instance} />
        );
        return [
            <div className={this.styleSheet.responsesLeftSideContainer}>
                {miniResponses}
            </div>,
            <QuestionnaireInstanceSwitcher ref="instanceSwitcher" className={this.styleSheet.responsesRightSide}>
                {fullInstances}
            </QuestionnaireInstanceSwitcher>
        ];
    }

    onMount() {
        this.switchToInstance(this.getQuestionnaire().getAllInstances()[0]);
    }
}


export class QuestionnaireAnswersPanel extends UI.Element {
    render() {
        return [
            <TabArea>
                <Panel title={UI.T("Summary")} style={{paddingTop: "10px"}}>
                    <QuestionnaireSummaryWidget questionnaireId={this.options.questionnaireId} />
                </Panel>
                <Panel title={UI.T("Responses")}>
                    <QuestionnaireResponsesWidget questionnaireId={this.options.questionnaireId} />
                </Panel>
            </TabArea>
        ];
    }
}


export class DelayedQuestionnaireAnswersPanel extends UI.Element {
    render() {
        if (this.options.error) {
            return StateDependentElement.renderError(this.options.error);
        }
        if (!this.options.loaded) {
            return StateDependentElement.renderLoading();
        }
        return <QuestionnaireAnswersPanel questionnaireId={this.options.questionnaireId} />;
    }

    onMount() {
        Ajax.getJSON("/questionnaire_all_answers/", {
            questionnaireId: this.options.questionnaireId
        }).then(
            () => this.updateOptions({loaded: true}),
            (error) => this.updateOptions({error})
        );
    }
}
