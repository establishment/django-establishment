import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";

class Questionnaire extends StoreObject {
    declare id: number;
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

export const QuestionnaireStore = new GenericObjectStore("questionnaire", Questionnaire);

export class QuestionnaireQuestion extends StoreObject {
    declare id: number;
    declare questionnaireId: number;
    declare priority: number;
    declare text?: string;
    declare type?: number;
    options: QuestionnaireQuestionOption[] = [];

    static Type = {
        PLAIN_TEXT: 1,
        SINGLE_CHOICE: 2,
        MULTIPLE_CHOICE: 3
    };

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

const QuestionnaireQuestionStore = new GenericObjectStore("questionnairequestion", QuestionnaireQuestion, {
    dependencies: ["Questionnaire"]
});

class QuestionnaireQuestionOption extends StoreObject {
    declare id: number;
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

const QuestionnaireQuestionOptionStore = new GenericObjectStore("QuestionnaireQuestionOption", QuestionnaireQuestionOption, {
    dependencies: ["QuestionnaireQuestion"]
});

class QuestionnaireInstance extends StoreObject {
    declare id: number;
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
}

class QuestionnaireInstanceStoreClass extends GenericObjectStore<QuestionnaireInstance> {
    constructor() {
        super("QuestionnaireInstance", QuestionnaireInstance, {
            dependencies: ["Questionnaire", "QuestionnaireQuestion", "QuestionnaireQuestionOption"]
        });
    }

    getCurrentUserInstance(questionnaireId: number): QuestionnaireInstance | undefined {
        return this.all().find((instance: QuestionnaireInstance) => instance.userId === (USER as any).id && instance.questionnaireId === questionnaireId);
    }
}

export const QuestionnaireInstanceStore = new QuestionnaireInstanceStoreClass();

class QuestionnaireQuestionResponse extends StoreObject {
    declare id: number;
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

const QuestionnaireQuestionResponseStore = new GenericObjectStore("QuestionnaireQuestionResponse", QuestionnaireQuestionResponse, {
    dependencies: ["QuestionnaireInstance"]
});
