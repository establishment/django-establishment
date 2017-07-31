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
    UI,
} from "UI";
import {GlobalState} from "State";
import {Ajax} from "Ajax";
import {StemDate} from "Time";
import {ArticleStore} from "ArticleStore";
import {PublicUserStore} from "UserStore";
import {Language} from "LanguageStore";
import {UserHandle} from "UserHandle";
import {GlobalStyle} from "GlobalStyle";
import {Level} from "Constants";

class TransferOwnershipModal extends ActionModal {
    getActionName() {
        return "Transfer ownership";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }

    getBody() {
        return [
            <UI.TextElement ref="text" value={"Set owner"}/>,
            <Form style={{marginTop: "10px"}}>
                <FormField ref="ownerFormField" label="Author ID">
                    <TextInput ref="ownerFormInput"  value=""/>
                </FormField>
            </Form>
        ];
    }

    getFooter() {
        return [
            <TemporaryMessageArea ref="messageArea"/>,
            <ButtonGroup>
                <Button label="Close" onClick={() => this.hide()}/>
                <AjaxButton ref="transferOwnershipButton" level={this.getActionLevel()} onClick={() => {this.action()}}
                               statusOptions={[this.getActionName(), {faIcon: "spinner fa-spin", label:" transfering ownership ..."},
                                               this.getActionName(), "Failed"]}/>
            </ButtonGroup>
        ];
    }

    setArticle(article) {
        this.article = article;
        this.text.setValue("Set owner for " + this.article.name + ":");
        this.ownerFormInput.setValue(this.article.userCreatedId);
    }

    action() {
        let table = this.options.parent.table;
        let newOwner = this.ownerFormInput.getValue();
        let request = {
            newOwner: newOwner
        };

        this.messageArea.showMessage("Saving...", "black", null);

        this.transferOwnershipButton.ajaxCall({
            url: "/article/" + this.article.id + "/set_owner/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.messageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully changed owner", data);
                    this.messageArea.showMessage("Author successfully changed");
                    GlobalState.importState(data.state);
                    console.log(data.state);
                    table.redraw();
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in changing owner:\n" + xhr.status + ":\n" + xhr.responseText);
                this.messageArea.showMessage("Error in changing owner", "red");
            }
        });
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
        return <UI.TextElement ref="text" value={"Delete article?"}/>;
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

    setArticle(article) {
        this.article = article;
        this.text.setValue("Delete " + this.article.name + "?");
    }

    deleteArticle() {
        let table = this.options.parent.table;
        let request = {};
        this.deleteArticleButton.ajaxCall({
            url: "/article/" + this.article.id + "/delete/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    this.messageArea.showMessage(data.error, "red");
                    console.log(data.error);
                } else {
                    console.log("Successfully deleted article", data);
                    table.options.articles.splice(table.getArticleIndex(this.article.id), 1);
                    table.redraw();
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in deleting article:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
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
        this.createArticleButton.ajaxCall({
            url: "/create_article/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.messageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully created article", data);
                    GlobalState.importState(data.state);
                    this.options.parent.table.addArticle(ArticleStore.get(data.article.id));
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in creating article:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
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
            value: article => <UserHandle id={article.userCreatedId}/>,
            rawValue: article => PublicUserStore.get(article.userCreatedId).username,
            headerName: "Author",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => (article.isPublic ? <span className="fa fa-check fa-lg" style={{color: "green"}}/>
                : <span className="fa fa-times fa-lg" style={{color: "red"}}/>),
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
                                                 onClick={() => {
                                                     this.options.parent.transferOwnershipModal.show();
                                                     this.options.parent.transferOwnershipModal.setArticle(article);
                                                 }}/>,
                    headerName: "Set owner",
                    headerStyle: headerStyle,
                    cellStyle: cellStyle
                });
            }
            columns.push({
                value: article => <Button level={Level.DANGER} label="Delete"
                                             onClick={() => {
                                                 this.options.parent.deleteArticleModal.show();
                                                 this.options.parent.deleteArticleModal.setArticle(article);
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
                           onClick={() => this.createArticleModal.show()}
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
        super.onMount();
        this.getArticles();

        if (this.options.readOnly === true)
            return;

        this.createArticleModal = <CreateArticleModal parent={this}/>;

        if (USER.isSuperUser) {
            this.transferOwnershipModal = <TransferOwnershipModal parent={this}/>;
        }

        this.deleteArticleModal = <DeleteArticleModal parent={this}/>;
    }

    getArticles() {
        if (this.options.articles && this.options.articles.length > 0) {
            return;
        }

        let request = {};
        Ajax.getJSON("/get_available_articles/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    this.table.options.articles = ArticleStore.all();
                    this.table.redraw();
                }
            },
            (error) => {
                console.log("Error in fetching articles");
                console.log(error.message);
                console.log(error.stack);
            }
        );
    }
}

class TranslationManager extends Panel {
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
        if (!this.options.readOnly)
            addButton = <div className="pull-right"><Button level={Level.PRIMARY} label="Add translation"
                                                               onClick={() => this.addTranslationModal.show()}
                                                               style={{marginTop: "5px", marginBottom: "5px"}}/></div>;
        return [<div className="pull-left"><h4><strong>{this.options.title}</strong></h4></div>, addButton, this.table];
    }

    onMount() {
        super.onMount();
        this.getTranslations();

        if (this.options.readOnly === true)
            return;

        this.addTranslationModal = <AddTranslationModal parent={this} baseArticle={this.options.baseArticle}/>;

        if (USER.isSuperUser) {
            this.transferOwnershipModal = <TransferOwnershipModal parent={this}/>;
        }

        this.deleteArticleModal = <DeleteArticleModal parent={this}/>;
    }

    getTranslations() {
        if (!this.options.baseArticle)
            return;
        let request = {};
        Ajax.getJSON("/article/" + this.options.baseArticle.id + "/get_translations/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    for (let article of ArticleStore.all()) {
                        if (article.baseArticleId == this.options.baseArticle.id) {
                            this.table.options.articles.push(article);
                        }
                    }
                    this.table.redraw();
                }
            },
            (error) => {
                console.log("Error in fetching articles");
                console.log(error.message);
                console.log(error.stack);
            }
        );
    }
}

export {ArticleManager, TranslationManager};
