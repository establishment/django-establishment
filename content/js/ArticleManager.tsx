import {type ColumnHandler, type ColumnInput} from "../../../stemjs/base/ColumnHandler";
import {UI, type ExtendedOptions, type ElementOptions} from "../../../stemjs/ui/UIBase";
import {ActionModal} from "../../../stemjs/ui/modal/Modal";
import {Button} from "../../../stemjs/ui/button/Button";
import {ButtonGroup} from "../../../stemjs/ui/button/ButtonGroup";
import {Form, FormField} from "../../../stemjs/ui/form/Form";
import {RawCheckboxInput, Select, TextInput} from "../../../stemjs/ui/input/Input";
import {Link} from "../../../stemjs/ui/primitives/Link";
import {SortableTable} from "../../../stemjs/ui/table/SortableTable";
import {TemporaryMessageArea} from "../../../stemjs/ui/misc/TemporaryMessageArea";
import {Level} from "../../../stemjs/ui/Constants";
import {Ajax} from "../../../stemjs/base/Ajax";
import {StemDate} from "../../../stemjs/time/Date";
import {AjaxButton} from "../../../stemjs/ui/button/AjaxButton";
import {FAIcon} from "../../../stemjs/ui/FontAwesome";
import {GlobalStyle} from "../../../stemjs/ui/GlobalStyle";

import {PublicUser} from "../../../csaaccounts/js/state/UserStore";
import {Language} from "../../localization/js/state/LanguageStore";
import {Article} from "./state/Article";

import {UserHandle} from "../../../csaaccounts/js/UserHandle";


export interface TransferOwnershipModalOptions {
    article?: any;
}

class TransferOwnershipModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, TransferOwnershipModalOptions>;
    declare messageArea: TemporaryMessageArea;
    declare ownerFormInput: TextInput;
    declare transferOwnershipButton: AjaxButton;

    getActionName() {
        return "Transfer ownership";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }

    getArticle() {
        return this.options.article;
    }

    getBody() {
        return [
            <UI.TextElement ref="text" value={"Set owner for " + this.getArticle().name + ":"}/>,
            <Form style={{marginTop: "10px"}}>
                <FormField ref="ownerFormField" label="Author ID">
                    <TextInput ref="ownerFormInput"  value={this.getArticle().userCreatedId} />
                </FormField>
            </Form>
        ];
    }

    getFooter() {
        return [
            <TemporaryMessageArea ref="messageArea"/>,
            <ButtonGroup>
                <Button label="Close" onClick={() => this.hide()}/>
                <AjaxButton ref="transferOwnershipButton" level={this.getActionLevel()} onClick={() => this.action()}
                               statusOptions={[this.getActionName(), {faIcon: "spinner fa-spin", label:" transfering ownership ..."},
                                               this.getActionName(), "Failed"]}/>
            </ButtonGroup>
        ];
    }

    action() {
        let newOwner = this.ownerFormInput.getValue();
        let request = {
            newOwner: newOwner
        };

        this.messageArea.showMessage("Saving...", "black", null);

        this.transferOwnershipButton.postJSON("/article/" + this.getArticle().id + "/set_owner/", request).then(
            () => this.hide(),
            (error) => this.messageArea.showMessage("Error in changing owner " + error.message, "red")
        );
    }

    hide() {
        this.messageArea.clear();
        super.hide();
    }
}


export interface DeleteArticleModalOptions {
    article?: Article;
    parent?: any;
}

class DeleteArticleModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, DeleteArticleModalOptions>;
    declare deleteArticleButton: AjaxButton;
    declare messageArea: TemporaryMessageArea;

    getActionName() {
        return "Delete article";
    }

    getBody() {
        return <UI.TextElement ref="text" value={"Delete " + this.getArticle().name + "?"}/>;
    }

    getArticle() {
        return this.options.article;
    }

    getFooter() {
        return [<TemporaryMessageArea ref="messageArea"/>,
            <ButtonGroup>
                <Button label="Close" onClick={() => this.hide()}/>
                <AjaxButton ref="deleteArticleButton" level={Level.DANGER} onClick={() => {this.deleteArticle()}}
                               statusOptions={["Delete article", {faIcon: "spinner fa-spin", label:" deleting article ..."},
                                               "Delete article", "Failed"]}/>
            </ButtonGroup>
        ];
    }

    deleteArticle() {
        this.deleteArticleButton.postJSON("/article/" + this.getArticle().id + "/delete/", {}).then(
            () => {
                let table = this.options.parent.table;
                table.options.articles.splice(table.getArticleIndex(this.getArticle().id), 1);
                table.redraw();
                this.hide();
            },
            (error) => this.messageArea.showMessage(error.message, "red")
        );
    }

    hide() {
        this.messageArea.clear();
        super.hide();
    }
}

export interface CreateArticleModalOptions {
    parent?: any;
}

class CreateArticleModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, CreateArticleModalOptions>;
    declare articleNameInput: TextInput;
    declare createArticleButton: AjaxButton;
    declare dependencyInput: TextInput;
    declare languageSelect: Select<any>;
    declare messageArea: TemporaryMessageArea;
    declare publicCheckbox: RawCheckboxInput;

    getActionName() {
        return "Create article";
    }

    getBody() {
        return <Form style={{marginTop: "10px"}}>
            <FormField ref="articleNameFormField" label="Article name">
                <TextInput ref="articleNameInput"  value=""/>
            </FormField>
            <FormField ref="dependencyFormField" label="Dependencies">
                <TextInput ref="dependencyInput" value=""/>
            </FormField>
            <FormField ref="languageFormField" label="Language">
                <Select ref="languageSelect" options={Language.all()}/>
            </FormField>
            <FormField ref="publicFormField" label="Public">
                <RawCheckboxInput ref="publicCheckbox"/>
            </FormField>
        </Form>;
    }

    getFooter() {
        return [<TemporaryMessageArea ref="messageArea"/>,
            <ButtonGroup>
                <Button label="Close" onClick={() => this.hide()}/>
                <AjaxButton ref="createArticleButton" level={Level.PRIMARY} onClick={() => {this.createArticle()}}
                               statusOptions={["Create article", {faIcon: "spinner fa-spin", label:" creating article ..."},
                                               "Create article", "Failed"]}/>
            </ButtonGroup>
        ];
    }

    createArticle(options?) {
        let name = this.articleNameInput.getValue();
        let dependency = this.dependencyInput.getValue();
        let languageId = this.languageSelect.get().id;
        let isPublic = this.publicCheckbox.getValue();
        let request = {
            name: name,
            dependency: dependency,
            languageId: languageId,
            isPublic: isPublic
        };
        if (options) {
            Object.assign(request, options);
        }
        this.createArticleButton.postJSON("/create_article/", request).then(
            (data) => {
                this.options.parent.table.addArticle(Article.get(data.article.id));
                this.hide();
            },
            (error) => {
                this.messageArea.showMessage(error.message, "red");
            }
        );
    }

    hide() {
        this.messageArea.clear();
        super.hide();
    }
}


export interface AddTranslationModalOptions {
    baseArticle?: any;
}

class AddTranslationModal extends CreateArticleModal {
    declare options: ExtendedOptions<CreateArticleModal, AddTranslationModalOptions>;

    getActioName() {
        return "Add translation";
    }

    getBody() {
        const baseArticle = this.options.baseArticle;
        return <Form style={{marginTop: "10px"}}>
                    <FormField ref="articleNameFormField" label="Article name">
                        <TextInput ref="articleNameInput"  value={"Translation for " + baseArticle.name}/>
                    </FormField>
                    <FormField ref="dependencyFormField" label="Dependencies">
                        <TextInput ref="dependencyInput" value={baseArticle.dependency}/>
                    </FormField>
                    <FormField ref="languageFormField" label="Language">
                        <Select ref="languageSelect" options={Language.all()}/>
                    </FormField>
                    <FormField ref="publicFormField" label="Public">
                        <RawCheckboxInput ref="publicCheckbox" initialValue={baseArticle.isPublic}/>
                    </FormField>
                </Form>
    }

    getFooter() {
        const baseArticle = this.options.baseArticle;
        return [<TemporaryMessageArea ref="messageArea"/>,
            <ButtonGroup>
                <Button label="Close" onClick={() => this.hide()}/>
                <AjaxButton ref="createArticleButton" level={Level.PRIMARY}
                               onClick={() => this.createArticle({
                                   baseArticleId: baseArticle.id,
                                   markup: baseArticle.markup
                               })}
                               statusOptions={["Add translation", {faIcon: "spinner fa-spin", label:" creating translation article ..."},
                                               "Success", "Failed"]}/>
            </ButtonGroup>
        ];
    }
}

export interface ArticleOwnerSpanOptions {
    article?: any;
}

class ArticleOwnerSpan extends UI.Primitive("span") {
    declare options: ElementOptions<ArticleOwnerSpanOptions>;

    getArticle() {
        return this.options.article;
    }

    render() {
        return <UserHandle id={this.getArticle().userCreatedId}/>;
    }

    onMount() {
        this.attachChangeListener(this.getArticle(), () => this.redraw());
    }
}

export interface ArticlePublicSpanOptions {
    article?: any;
}

class ArticlePublicSpan extends FAIcon {
    declare options: ExtendedOptions<FAIcon, ArticlePublicSpanOptions>;

    getDefaultOptions() {
        return {
            size: "lg"
        };
    }

    getArticle() {
        return this.options.article;
    }

    isPublic() {
        return this.options.article.isPublic;
    }

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setStyle("color", this.isPublic() ? "green" : "red");
    }

    setOptions(options) {
        super.setOptions(options);
        this.options.icon = this.isPublic() ? "check" : "times";
    }

    onMount() {
        this.attachChangeListener(this.getArticle(),
            () => this.updateOptions({icon: this.isPublic() ? "check" : "times"})
        );
    }
}

export interface ArticleTableOptions {
    articles?: any;
    parent?: any;
    // Table.setOptions maps these through ColumnHandler.mapColumns in place, so by the time
    // resetColumnSortingOrder reads them back they are handlers rather than what a caller passed
    columns?: ColumnHandler<any>[];
}

class ArticleTable extends SortableTable {
    declare options: ExtendedOptions<InstanceType<typeof SortableTable>, ArticleTableOptions>;

    setOptions(options) {
        super.setOptions(options);
        this.resetColumnSortingOrder();
    }

    resetColumnSortingOrder() {
        const {columns} = this.options;
        this.columnSortingOrder = [columns[4], columns[5], columns[0], columns[3], columns[2], columns[1]];
    }

    getArticleIndex(articleId) {
        for (let i = 0; i < this.options.articles.length; i += 1) {
            if (this.options.articles[i].id === articleId)
                return i;
        }
        return -1;
    }

    addArticle(article) {
        this.options.articles.push(article);
        this.redraw();
    }

    getDefaultColumns() {
        let cellStyle = {
            textAlign: "left",
            verticalAlign: "middle"
        };
        let headerStyle = {
            textAlign: "left",
            verticalAlign: "middle"
        };
        let columns: ColumnInput<any>[] = [{
            value: article => <Link href={"/article/" + article.id + "/edit/"} value={article.name} />,
            rawValue: article => article.name,
            headerName: "Article",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => <ArticleOwnerSpan article={article} />,
            rawValue: article => PublicUser.get(article.userCreatedId).username,
            headerName: "Author",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => <ArticlePublicSpan article={article} />,
            rawValue: article => (article.isPublic ? "Yes" : "No"),
            headerName: "Public",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => Language.get(article.languageId).name,
            rawValue: article => Language.get(article.languageId).name,
            headerName: "Language",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => StemDate.unix(article.dateCreated).locale("en").format("DD/MM/YYYY HH:mm:ss"),
            rawValue: article => article.dateCreated,
            sortDescending: true,
            headerName: "Date created",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => StemDate.unix(article.dateModified).locale("en").format("DD/MM/YYYY HH:mm:ss"),
            rawValue: article => article.dateModified,
            sortDescending: true,
            headerName: "Date modified",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }];
        if (!this.options.parent.options.readOnly) {
            if (USER.isSuperUser) {
                columns.push({
                    value: article => <Button level={Level.PRIMARY} label="Set owner"
                                              onClick={() => TransferOwnershipModal.show({ article })}/>,
                    headerName: "Set owner",
                    headerStyle: headerStyle,
                    cellStyle: cellStyle
                });
            }
            columns.push({
                value: article => <Button level={Level.DANGER} label="Delete"
                                             onClick={() => {
                                                 DeleteArticleModal.show({
                                                     article,
                                                     parent: this.options.parent
                                                 });
                                             }}/>,
                headerName: "Delete",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            });
        }

        return columns;
    }

    getEntries() {
        return this.sortEntries(this.options.articles);
    }
}

export interface ArticleManagerOptions {
    articles?: any;
    readOnly?: any;
}

class ArticleManager extends UI.Element {
    declare options: ElementOptions<ArticleManagerOptions>;

    getDefaultOptions() {
        return {
            title: "Article manager",
            articles: [],
        };
    }

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(GlobalStyle.Container.SMALL);
    }

    setOptions(options) {
        options = Object.assign(this.getDefaultOptions(), options);
        super.setOptions(options);
    }

    render() {
        let addButton = null;
        if (!this.options.readOnly) {
            addButton = <div className="pull-right">
                <Button level={Level.PRIMARY} label="Create article"
                           onClick={() => CreateArticleModal.show({parent: this})}
                           style={{marginTop: "5px", marginBottom: "5px"}}/>
            </div>;
        }

        this.options.articles = Article.all();

        return [
            <div className="pull-left">
                <h4><strong>{this.options.title}</strong></h4>
            </div>,
            addButton,
            <ArticleTable ref="table" articles={this.options.articles} parent={this}/>,
        ];
    }
}

export interface ArticleTranslationManagerOptions {
    baseArticle?: Article;
    readOnly?: any;
}

class ArticleTranslationManager extends UI.Element {
    declare options: ElementOptions<ArticleTranslationManagerOptions>;
    declare table: any;

    getDefaultOptions() {
        return {
            title: "Translation manager"
        };
    }

    setOptions(options) {
        options = Object.assign(this.getDefaultOptions(), options);
        super.setOptions(options);
    }

    render() {
        this.table = <ArticleTable articles={[]} parent={this}/>;
        let addButton = null;
        if (!this.options.readOnly) {
            addButton = <div className="pull-right"><Button level={Level.PRIMARY} label="Add translation"
                                                            onClick={() => AddTranslationModal.show({
                                                                parent: this,
                                                                baseArticle: this.options.baseArticle
                                                            })}
                                                            style={{marginTop: "5px", marginBottom: "5px"}}/></div>;
        }
        return [<div className="pull-left"><h4><strong>{this.options.title}</strong></h4></div>, addButton, this.table];
    }

    onMount() {
        if (!this.options.baseArticle) {
            return;
        }

        Ajax.getJSON("/article/" + this.options.baseArticle.id + "/get_translations/", {}).then(
            () => {
                this.table.options.articles.push(
                    ...Article.filter((article) => article.baseArticleId === this.options.baseArticle.id)
                );
                this.table.redraw();
            }
        );
    }
}

export {ArticleManager, ArticleTranslationManager};
