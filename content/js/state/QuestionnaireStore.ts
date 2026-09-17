import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {field} from "../../../../stemjs/state/StoreField";
import {type StoreId, type RawStoreObject} from "../../../../stemjs/state/State";
import {multikeySort} from "../../../../stemjs/base/Utils";


@globalStore
export class Questionnaire extends BaseStore("questionnaire") {
    declare id: number;
    declare name: string;
    declare ownerId: number;
    declare visible: boolean;
    questions: QuestionnaireQuestion[] = [];

    getQuestions(): QuestionnaireQuestion[] {
        return multikeySort(this.questions, question => [question.priority, question.id]);
    }

    addQuestion(question: QuestionnaireQuestion): void {
        this.questions.push(question);
    }

    getAllInstances(): QuestionnaireInstance[] {
        return QuestionnaireInstance.all().filter((instance: QuestionnaireInstance) => instance.questionnaireId === this.id);
    }
}


@globalStore
export class QuestionnaireQuestion extends BaseStore("questionnairequestion", {dependencies: ["questionnaire"]}) {
    declare id: number;
    declare otherChoice: boolean;

    static Type = {
        PLAIN_TEXT: 1,
        SINGLE_CHOICE: 2,
        MULTIPLE_CHOICE: 3
    };

    @field(Questionnaire) questionnaire;
    declare priority: number;
    declare text: string;
    declare type: number;
    options: QuestionnaireQuestionOption[] = [];

    getQuestionnaire(): Questionnaire {
        return this.questionnaire;
    }

    constructor(obj?: RawStoreObject) {
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
        return multikeySort(this.options, option => [option.priority, option.id]);
    }

    getCurrentUserResponse(): QuestionnaireQuestionResponse | null {
        const userInstance = QuestionnaireInstance.getCurrentUserInstance(this.questionnaireId);
        return userInstance?.getQuestionResponse(this.id);
    }
}


@globalStore
export class QuestionnaireQuestionOption extends BaseStore("QuestionnaireQuestionOption", {dependencies: ["questionnairequestion"]}) {
    declare answer: string;

    @field(QuestionnaireQuestion) question;
    declare priority: number;

    constructor(obj?: RawStoreObject) {
        super(obj);
        const question = this.getQuestion();
        question?.addOption(this);
    }

    getQuestion(): QuestionnaireQuestion {
        return this.question;
    }
}


@globalStore
export class QuestionnaireInstance extends BaseStore("QuestionnaireInstance", {dependencies: ["questionnaire", "questionnairequestion", "QuestionnaireQuestionOption"]}) {
    // Unix timestamps
    declare dateCreated: number;
    declare dateSubmitted?: number;

    @field(Questionnaire) questionnaire;
    declare userId: number;
    questionResponses: Map<StoreId, QuestionnaireQuestionResponse> = new Map();

    getQuestionnaire(): Questionnaire {
        return this.questionnaire;
    }

    addQuestionResponse(questionResponse: QuestionnaireQuestionResponse): void {
        this.questionResponses.set(questionResponse.questionId, questionResponse);
    }

    getQuestionResponse(questionId: StoreId): QuestionnaireQuestionResponse | undefined {
        return this.questionResponses.get(questionId);
    }

    static getCurrentUserInstance(questionnaireId: StoreId): QuestionnaireInstance | undefined {
        return this.all().find((instance: QuestionnaireInstance) => instance.userId === USER.id && instance.questionnaireId === questionnaireId);
    }
}


@globalStore
export class QuestionnaireQuestionResponse extends BaseStore("QuestionnaireQuestionResponse", {dependencies: ["QuestionnaireInstance"]}) {
    @field(QuestionnaireInstance) instance;
    declare questionId: StoreId;
    declare text?: string;
    // The choices many-to-many, sent with include_many_to_many=True and never omitted
    declare choiceIds: StoreId[];

    constructor(obj?: RawStoreObject) {
        super(obj);
        const instance = this.getQuestionnaireInstance();
        if (instance) {
            instance.addQuestionResponse(this);
        }
    }

    getQuestionnaireInstance(): QuestionnaireInstance {
        return this.instance;
    }

    getText(): string {
        return this.text || "";
    }
}
