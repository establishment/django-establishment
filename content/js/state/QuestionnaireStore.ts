import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {StoreId} from "../../../../stemjs/state/State";


@globalStore
export class Questionnaire extends BaseStore("questionnaire") {
    declare title?: string;
    questions: QuestionnaireQuestion[] = [];

    getQuestions(): QuestionnaireQuestion[] {
        return this.questions.sort(
            (a, b) => a.priority === b.priority ? a.id - b.id : a.priority - b.priority
        );
    }

    addQuestion(question: QuestionnaireQuestion): void {
        this.questions.push(question);
    }

    getAllInstances(): QuestionnaireInstance[] {
        return QuestionnaireInstance.all().filter((instance: QuestionnaireInstance) => instance.questionnaireId === this.id);
    }
}


@globalStore
export class QuestionnaireQuestion extends BaseStore("questionnairequestion", {dependencies: ["Questionnaire"]}) {
    static Type = {
        PLAIN_TEXT: 1,
        SINGLE_CHOICE: 2,
        MULTIPLE_CHOICE: 3
    };

    declare questionnaireId: number;
    declare priority: number;
    declare text?: string;
    declare type?: number;
    options: QuestionnaireQuestionOption[] = [];

    getQuestionnaire(): Questionnaire | null {
        return Questionnaire.get(this.questionnaireId);
    }

    constructor(obj?: any) {
        super(obj);
        const questionnaire = this.getQuestionnaire();
        if (questionnaire) {
            questionnaire.addQuestion(this);
        }
    }

    addOption(option: QuestionnaireQuestionOption): void {
        this.options.push(option);
    }

    getOptions(): QuestionnaireQuestionOption[] {
        return this.options.sort(
            (a, b) => a.priority === b.priority ? a.id - b.id : a.priority - b.priority
        );
    }

    getCurrentUserResponse(): QuestionnaireQuestionResponse | null {
        const userInstance = QuestionnaireInstance.getCurrentUserInstance(this.questionnaireId);
        return userInstance?.getQuestionResponse(this.id);
    }
}


@globalStore
export class QuestionnaireQuestionOption extends BaseStore("QuestionnaireQuestionOption", {dependencies: ["QuestionnaireQuestion"]}) {
    declare questionId: number;
    declare priority: number;
    declare text?: string;

    constructor(obj?: any) {
        super(obj);
        const question = this.getQuestion();
        question?.addOption(this);
    }

    getQuestion(): QuestionnaireQuestion | null {
        return QuestionnaireQuestion.get(this.questionId);
    }
}


@globalStore
export class QuestionnaireInstance extends BaseStore("QuestionnaireInstance", {dependencies: ["Questionnaire", "QuestionnaireQuestion", "QuestionnaireQuestionOption"]}) {
    declare questionnaireId: number;
    declare userId: number;
    questionResponses: Map<StoreId, QuestionnaireQuestionResponse> = new Map();

    getQuestionnaire(): Questionnaire | null {
        return Questionnaire.get(this.questionnaireId);
    }

    addQuestionResponse(questionResponse: QuestionnaireQuestionResponse): void {
        this.questionResponses.set(questionResponse.questionId, questionResponse);
    }

    getQuestionResponse(questionId: StoreId): QuestionnaireQuestionResponse | undefined {
        return this.questionResponses.get(questionId);
    }

    static getCurrentUserInstance(questionnaireId: StoreId): QuestionnaireInstance | undefined {
        return this.all().find((instance: QuestionnaireInstance) => instance.userId === (USER as any).id && instance.questionnaireId === questionnaireId);
    }
}


@globalStore
export class QuestionnaireQuestionResponse extends BaseStore("QuestionnaireQuestionResponse", {dependencies: ["QuestionnaireInstance"]}) {
    declare instanceId: StoreId;
    declare questionId: StoreId;
    declare text?: string;
    declare choiceId?: number;

    constructor(obj?: any) {
        super(obj);
        const instance = this.getQuestionnaireInstance();
        if (instance) {
            instance.addQuestionResponse(this);
        }
    }

    getQuestionnaireInstance(): QuestionnaireInstance | null {
        return QuestionnaireInstance.get(this.instanceId);
    }

    getText(): string {
        return this.text || "";
    }

    getChoice(): QuestionnaireQuestionOption | null {
        return QuestionnaireQuestionOption.get(this.choiceId);
    }
}
