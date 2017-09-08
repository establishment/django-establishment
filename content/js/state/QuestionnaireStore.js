import {StoreObject, GenericObjectStore} from "Store";


class Questionnaire extends StoreObject {
    constructor() {
        super(...arguments);
        this.questions = [];
    }

    getQuestions() {
        return this.questions.sort((a, b) => a.id - b.id);
    }

    addQuestion(question) {
        this.questions.push(question);
    }
}

export const QuestionnaireStore = new GenericObjectStore("questionnaire", Questionnaire);

export class QuestionnaireQuestion extends StoreObject {
    static Type = {
        PLAIN_TEXT: 1,
        MULTIPLE_CHOICE: 2,
    };

    constructor() {
        super(...arguments);
        QuestionnaireStore.get(this.questionnaireId).addQuestion(this);
        this.options = [];
    }

    addOption(option) {
        this.options.push(option);
    }

    getOptions() {
        return this.options.sort((a, b) => a.id - b.id);
    }

    getCurrentUserResponse() {
        const userInstance = QuestionnaireInstanceStore.getCurrentUserInstance(this.questionnaireId);
        return userInstance && userInstance.getQuestionResponse(this.id);
    }
}

const QuestionnaireQuestionStore = new GenericObjectStore("questionnairequestion", QuestionnaireQuestion, {
    dependencies: ["Questionnaire"]
});

class QuestionnaireQuestionOption extends StoreObject {
    constructor() {
        super(...arguments);
        this.getQuestion() && this.getQuestion().addOption(this);
    }

    getQuestion() {
        return QuestionnaireQuestionStore.get(this.questionId);
    }
}

const QuestionnaireQuestionOptionStore = new GenericObjectStore("QuestionnaireQuestionOption", QuestionnaireQuestionOption, {
    dependencies: ["QuestionnaireQuestion"]
});

class QuestionnaireInstance extends StoreObject {
    constructor() {
        super(...arguments);
        this.questionResponses = new Map();
    }

    addQuestionResponse(questionResponse) {
        this.questionResponses.set(questionResponse.questionId, questionResponse);
    }

    getQuestionResponse(questionId) {
        return this.questionResponses.get(questionId);
    }
}

class QuestionnaireInstanceStoreClass extends GenericObjectStore {
    constructor() {
        super("QuestionnaireInstance", QuestionnaireInstance, {
            dependencies: ["Questionnaire", "QuestionnaireQuestion", "QuestionnaireQuestionOption"]
        });
    }

    getCurrentUserInstance(questionnaireId) {
        return this.all().find(instance => instance.userId === USER.id && instance.questionnaireId === questionnaireId);
    }
}

export const QuestionnaireInstanceStore = new QuestionnaireInstanceStoreClass();

class QuestionnaireQuestionResponse extends StoreObject {
    constructor() {
        super(...arguments);
        this.getQuestionnaireInstance().addQuestionResponse(this);
    }

    getQuestionnaireInstance() {
        return QuestionnaireInstanceStore.get(this.instanceId);
    }

    getText() {
        return this.text || "";
    }

    getChoice() {
        return QuestionnaireQuestionOptionStore.get(this.choiceId);
    }
}

const QuestionnaireQuestionResponseStore = new GenericObjectStore("QuestionnaireQuestionResponse", QuestionnaireQuestionResponse, {
    dependencies: ["QuestionnaireInstance"]
});
