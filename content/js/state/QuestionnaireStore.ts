import {globalStore, BaseStore, StoreObject} from "../../../../stemjs/src/state/Store";

@globalStore
class Questionnaire extends BaseStore("questionnaire") {
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
        return QuestionnaireInstanceStore.all().filter((instance: QuestionnaireInstance) => instance.questionnaireId === this.id);
    }
}

export const QuestionnaireStore = Questionnaire;

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
        return QuestionnaireStore.get(this.questionnaireId);
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
        const userInstance = QuestionnaireInstanceStore.getCurrentUserInstance(this.questionnaireId);
        return userInstance && userInstance.getQuestionResponse(this.id);
    }
}

const QuestionnaireQuestionStore = QuestionnaireQuestion;

@globalStore
class QuestionnaireQuestionOption extends BaseStore("QuestionnaireQuestionOption", {dependencies: ["QuestionnaireQuestion"]}) {
    declare questionId: number;
    declare priority: number;
    declare text?: string;

    constructor(obj?: any) {
        super(obj);
        const question = this.getQuestion();
        if (question) {
            question.addOption(this);
        }
    }

    getQuestion(): QuestionnaireQuestion | null {
        return QuestionnaireQuestionStore.get(this.questionId);
    }
}

const QuestionnaireQuestionOptionStore = QuestionnaireQuestionOption;

@globalStore
class QuestionnaireInstance extends BaseStore("QuestionnaireInstance", {dependencies: ["Questionnaire", "QuestionnaireQuestion", "QuestionnaireQuestionOption"]}) {
    declare questionnaireId: number;
    declare userId: number;
    questionResponses: Map<number, QuestionnaireQuestionResponse> = new Map();

    getQuestionnaire(): Questionnaire | null {
        return QuestionnaireStore.get(this.questionnaireId);
    }

    addQuestionResponse(questionResponse: QuestionnaireQuestionResponse): void {
        this.questionResponses.set(questionResponse.questionId, questionResponse);
    }

    getQuestionResponse(questionId: number): QuestionnaireQuestionResponse | undefined {
        return this.questionResponses.get(questionId);
    }

    static getCurrentUserInstance(questionnaireId: number): QuestionnaireInstance | undefined {
        return this.all().find((instance: QuestionnaireInstance) => instance.userId === (USER as any).id && instance.questionnaireId === questionnaireId);
    }
}

export const QuestionnaireInstanceStore = QuestionnaireInstance;

@globalStore
class QuestionnaireQuestionResponse extends BaseStore("QuestionnaireQuestionResponse", {dependencies: ["QuestionnaireInstance"]}) {
    declare instanceId: number;
    declare questionId: number;
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
        return QuestionnaireInstanceStore.get(this.instanceId);
    }

    getText(): string {
        return this.text || "";
    }

    getChoice(): QuestionnaireQuestionOption | null {
        return QuestionnaireQuestionOptionStore.get(this.choiceId);
    }
}

const QuestionnaireQuestionResponseStore = QuestionnaireQuestionResponse;
