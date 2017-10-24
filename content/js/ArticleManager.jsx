import {
    ActionModal,
    AjaxButton,
    Button,
    ButtonGroup,
    CheckboxInput,
    Form,
    FormField,
    Link,
    Modal,
    Panel,
    Select,
    SortableTable,
    TemporaryMessageArea,
    TextInput,
    Level,
    UI,
} from "UI";
import {FAIcon} from "FontAwesome";
import {Ajax} from "Ajax";
import {StemDate} from "Time";
import {PublicUserStore} from "UserStore";
import {Language} from "LanguageStore";
import {UserHandle} from "UserHandle";
import {GlobalStyle} from "GlobalStyle";

import {ArticleStore} from "./state/ArticleStore";


class TransferOwnershipModal extends ActionModal {
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


class DeleteArticleModal extends ActionModal {
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

class CreateArticleModal extends ActionModal {
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
                <CheckboxInput ref="publicCheckbox" checked={false}/>
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

    createArticle(options) {
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
                this.options.parent.table.addArticle(ArticleStore.get(data.article.id));
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


class AddTranslationModal extends CreateArticleModal {
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
                        <CheckboxInput ref="publicCheckbox" checked={baseArticle.isPublic}/>
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

class ArticleOwnerSpan extends UI.Primitive("span") {
    getArticle() {
        return this.options.article;
    }

    render() {
        return <UserHandle id={this.getArticle().userCreatedId}/>;
    }

    onMount() {
        this.attachUpdateListener(this.getArticle(), () => this.redraw());
    }
}

class ArticlePublicSpan extends FAIcon {
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
        this.attachUpdateListener(this.getArticle(),
            () => this.updateOptions({icon: this.isPublic() ? "check" : "times"})
        );
    }
}

class ArticleTable extends SortableTable {
    setOptions(options) {
        super.setOptions(options);
        this.resetColumnSortingOrder();
    }

    resetColumnSortingOrder() {
        this.columnSortingOrder = [this.columns[4], this.columns[5], this.columns[0],
            this.columns[3], this.columns[2], this.columns[1]];
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

    setColumns() {
        let cellStyle = {
            textAlign: "left",
            verticalAlign: "middle"
        };
        let headerStyle = {
            textAlign: "left",
            verticalAlign: "middle"
        };
        let columns = [{
            value: article => <Link href={"/article/" + article.id + "/edit/"} value={article.name} />,
            rawValue: article => article.name,
            headerName: "Article",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => <ArticleOwnerSpan article={article} />,
            rawValue: article => PublicUserStore.get(article.userCreatedId).username,
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
        super.setColumns(columns);
    }

    getEntries() {
        return this.sortEntries(this.options.articles);
    }
}

class ArticleManager extends Panel {
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

        return [
            <div className="pull-left">
                <h4><strong>{this.options.title}</strong></h4>
            </div>,
            addButton,
            <ArticleTable ref="table" articles={this.options.articles} parent={this}/>,
        ];
    }

    onMount() {
        if (this.options.articles && this.options.articles.length > 0) {
            return;
        }
        Ajax.getJSON("/get_available_articles/", {}).then(
            () => this.table.updateOptions({articles: ArticleStore.all()})
        );
    }
}

class ArticleTranslationManager extends Panel {
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
                for (let article of ArticleStore.all()) {
                    if (article.baseArticleId === this.options.baseArticle.id) {
                        this.table.options.articles.push(article);
                    }
                }
                this.table.redraw();
            }
        );
    }
}

export {ArticleManager, ArticleTranslationManager};
