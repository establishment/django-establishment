import {
    ActionModal,
    AjaxButton,
    Button,
    ButtonGroup,
    Form,
    FormField,
    Link,
    Panel,
    SectionDivider,
    Select,
    TabArea,
    TemporaryMessageArea,
    TextArea,
    TextInput,
    UI,
} from "UI";
import {GlobalState} from "State";
import {Ajax} from "Ajax";
import {MarkupEditor} from "MarkupEditor";
import {ArticleRenderer} from "ArticleRenderer";
import {ArticleStore} from "ArticleStore";
import {Language} from "LanguageStore";
import {TranslationManager} from "ArticleManager";
import {Router} from "Router";
import {Level} from "ui/Constants";
const deleteRedirectLink = "/";

//TODO (@kira) : 4. fix line wrapping 5.Fix diffing svg gutter bug 7.Collapse button in section Divider maybe?
class ArticleMarkupEditor extends MarkupEditor {
    setOptions(options) {
        super.setOptions(options);
        this.options.value = this.options.article.markup;
    }

    setEditorOptions() {
        this.editorPanel.addListener("resize", () => {
            this.codeEditor.setWidth(this.editorPanel.getWidth() - 15);
        });

        this.codeEditor.addNodeListener("input", () => {
            let markup = this.codeEditor.getValue();
            try {
                this.updateValue(markup);
            } catch (e) {
                console.error("Exception in parsing markup: ", e);
            }
        });
    }

    getEditor() {
        return <TextArea ref="codeEditor" style={{
                                            width:"100%",
                                            fontFamily: "monospace",
                                            height: "calc(100% - 3px)",
                                            resize: "none",
                                            backgroundColor: "#F9F9F9"
                    }} value={this.options.value}/>
    }

    getMarkupRenderer() {
        return <ArticleRenderer ref="articleRenderer" article={this.options.article} style={{flex:"1", height: "100%", overflow: "auto"}} />
    }

    updateValue(markup) {
        this.options.article.markup = markup;
        this.articleRenderer.setValue(markup);
        this.articleRenderer.redraw();
    }
}


class DeleteArticleModal extends ActionModal {
    getActionName() {
        return "Delete Article";
    }

    getBody() {
        return <p>Delete {this.options.article.name}?</p>;
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
        let request = {};
        this.deleteArticleButton.ajaxCall({
            url: "/article/" + this.options.article.id + "/delete/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.messageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully deleted article", data);
                    if (this.options.article.baseArticleId)
                        window.location.replace("/article/" + this.options.article.baseArticleId + "/edit/");
                    else
                        window.location.replace(deleteRedirectLink);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in deleting article:\n" + xhr.status + ":\n" + xhr.responseText);
                this.messageArea.showMessage("Error in deleting article", "red");
            }
        });
    }
}

class ArticleEditor extends Panel {
    setOptions(options) {
        super.setOptions(options);

    }

    getArticle() {
        return ArticleStore.get(this.options.articleId);
    }

    initializeVersioning() {
        if (ArticleEditor.DiffWidgetClass) {
            this.versions = [];
            this.versionsLabels = [];
            for (let article of this.getArticle().getEdits()) {
                this.versions.push(article.content);
                this.versionsLabels.push("Version " + article.id);
            }
            this.versions.push(this.getArticle().markup);
            this.versionsLabels.push("Edit version");
            this.versions.reverse();
            this.versionsLabels.reverse();

            this.leftEditable = true;
            this.rightEditable = false;
        }
    }

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setStyle({
            display: "flex",
            flexDirection: "column",
            height: "100%",
        });
    }

    render() {
        this.initializeVersioning();
        let translationsPanel = null;
        let baseArticleForm = null;
        if (this.getArticle().baseArticleId) {
            baseArticleForm = <FormField ref="baseArticleFormField" label="Base article">
                <Link href={"/article/" + this.getArticle().baseArticleId + "/edit/"} value="Go to base article" />
            </FormField>;
        } else {
            translationsPanel = <Panel title="Translations">
                <TranslationManager title={"Translations for " + this.getArticle().name}
                                    baseArticle={this.getArticle()}/>
            </Panel>
        }
        let ownershipPanel = null;
        if (USER.isSuperUser) {
            ownershipPanel = <Panel title="Ownership">
                <Form style={{marginTop: "10px"}}>
                    <FormField ref="ownerFormField" label="Author ID">
                        <TextInput ref="ownerFormInput"  value={this.getArticle().userCreatedId}/>
                    </FormField>
                </Form>
                <AjaxButton ref="setOwnerButton" level={Level.INFO} onClick={() => {
                                let newOwner = this.ownerFormInput.getValue();
                                this.setOwner(newOwner);
                               }}
                               statusOptions={["Transfer ownership", {faIcon: "spinner fa-spin", label:" transfering ownership ..."}, "Transfer ownership", "Failed"]}
                        />
                <TemporaryMessageArea ref="setOwnerMessageArea"/>
            </Panel>
        }

        let revisionsPanel;
        if (ArticleEditor.DiffWidgetClass) {
            let DiffWidgetClass = ArticleEditor.DiffWidgetClass;
                revisionsPanel = <Panel title="Revisions" style={{height: "100%", display: "flex", flexDirection: "column"}}>
                <Panel>
                    <Select ref="leftTextSelector" options={this.versionsLabels}/>
                    <Select style={{float:"right", marginRight:"25px"}} ref="rightTextSelector" options={this.versionsLabels}/>
                </Panel>
                <DiffWidgetClass ref="diffWidget" leftEditable={this.leftEditable} rightEditable={this.rightEditable}
                                 leftTextValue={this.versions[2]} arrows={this.arrows} rightTextValue={this.versions[1]}
                                     style={{flex:"1", height: "calc(100% - 100px)", width: "calc(100% - 100px)"}} />
            </Panel>;
        }

        return [
            <h3>{this.getArticle().name + " Id=" + this.options.articleId}</h3>,
                <TabArea ref="tabArea" variableHeightPanels style={{flex: "1", height: "100%", display: "flex", flexDirection: "column"}}>
                <Panel title="Edit" active style={{height: "100%", overflow: "hidden"}}>
                    <AjaxButton ref="saveMarkupButton" level={Level.INFO} onClick={() => {
                                    let content = this.markupEditor.getValue();
                                    this.saveMarkup(content);
                                   }}
                               statusOptions={["Save", {faIcon: "spinner fa-spin", label:" saveing ..."}, "Save", "Failed"]}
                        />
                    <TemporaryMessageArea ref="saveMarkupMessageArea"/>
                    <ArticleMarkupEditor style={{height: "100%", marginTop: "-31px", display: "flex", flexDirection: "column"}}
                                         ref="markupEditor" article={this.getArticle()} />
                </Panel>
                {revisionsPanel}
                <Panel title="Summary">
                    <Form style={{marginTop: "10px"}}>
                        <FormField ref="articleNameFormField" label="Article name">
                            <TextInput ref="articleNameFormInput"  value={this.getArticle().name}/>
                        </FormField>
                        <FormField ref="dependencyFormField" label="Dependencies">
                            <TextInput ref="dependencyFormInput" value={this.getArticle().dependency}/>
                        </FormField>
                        {baseArticleForm}
                        <FormField ref="languageFormField" label="Language">
                            <Select ref="languageSelect" options={Language.all()}
                                       selected={Language.get(this.getArticle().languageId)}/>
                        </FormField>
                        <FormField ref="publicFormField" label="Public">
                            <CheckboxInput ref="publicCheckbox" checked={this.getArticle().isPublic}/>
                        </FormField>
                    </Form>
                    <AjaxButton ref="saveOptionsButton" level={Level.INFO} onClick={() => {
                                    let name = this.articleNameFormInput.getValue();
                                   let dependency = this.dependencyFormInput.getValue();
                                   let languageId = this.languageSelect.get().id;
                                   let isPublic = this.publicCheckbox.getValue();
                                   let options = {
                                       name: name,
                                       dependency: dependency,
                                       languageId: languageId,
                                       isPublic: isPublic
                                   };
                                   this.saveOptions(options);
                                   }}
                               statusOptions={["Save", {faIcon: "spinner fa-spin", label:" saveing ..."}, "Save", "Failed"]}
                        />
                    <Button ref="deleteArticleButton" level={Level.DANGER} label="Delete article"
                               style={{marginLeft: "3px"}}
                               onClick={() => this.deleteArticleModal.show()}/>
                    <TemporaryMessageArea ref="saveOptionsMessageArea"/>
                </Panel>
                {translationsPanel}
                {ownershipPanel}
            </TabArea>
        ];
    }

    saveMarkup(content) {
        let request = {
            markup: content
        };

        this.saveMarkupMessageArea.showMessage("Saving...", "black", null);

        this.saveMarkupButton.ajaxCall({
            url: "/article/" + this.options.articleId + "/edit/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                // Add a new version in the dropdown if the save is a success
                if (ArticleEditor.DiffWidgetClass) {
                    this.addNewVersion(content);
                }
                console.log("Successfully saved article", data);
                this.saveMarkupMessageArea.showMessage("Saved article");
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in saving article:\n" + xhr.status + ":\n" + xhr.responseText);
                this.saveMarkupMessageArea.showMessage("Error in saving the article", "red");
            }
        });
    }

    saveOptions(options) {
        let request = {};
        Object.assign(request, options);

        this.saveOptionsMessageArea.showMessage("Saving...", "black", null);

        this.saveOptionsButton.ajaxCall({
            url: "/article/" + this.options.articleId + "/edit/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.saveOptionsMessageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully saved article", data);
                    this.saveOptionsMessageArea.showMessage("Successfully saved article");
                    window.location.replace("/article/" + this.options.articleId + "/edit/");
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in saving article:\n" + xhr.status + ":\n" + xhr.responseText);
                this.saveOptionsMessageArea.showMessage("Error in saving the article", "red");
            }
        });
    }

    setOwner(newOwner) {
        let request = {
            newOwner: newOwner
        };

        this.setOwnerMessageArea.showMessage("Saving...", "black", null);

        this.setOwnerButton.ajaxCall({
            url: "/article/" + this.options.articleId + "/set_owner/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.setOwnerMessageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully changed owner", data);
                    this.setOwnerMessageArea.showMessage("Author successfully changed");
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in changing owner:\n" + xhr.status + ":\n" + xhr.responseText);
                this.setOwnerMessageArea.showMessage("Error in changing owner", "red");
            }
        });
    }

    addNewVersion(content) {
        this.versionsLabels[0] = ("Version " + this.versionsLabels.length);
        this.versions[0] = content;

        this.versions.unshift(this.markupEditor.getValue());
        this.versionsLabels.unshift("Edit version");

        let leftIndex = this.leftTextSelector.getIndex();
        let rightIndex = this.rightTextSelector.getIndex();

        this.leftTextSelector.redraw();
        this.rightTextSelector.redraw();

        this.setLeftIndex(leftIndex);
        this.setRightIndex(rightIndex);
    }

    setLeftIndex(index) {
        this.leftTextSelector.setIndex(index);
        this.diffWidget.setLeftText(this.versions[index]);
    }

    setRightIndex(index) {
        this.rightTextSelector.setIndex(index);
        this.diffWidget.setRightText(this.versions[index]);
    }

    onMount() {
        this.deleteArticleModal = <DeleteArticleModal article={this.getArticle()}/>;

        if (ArticleEditor.DiffWidgetClass) {
            this.tabArea.titleArea.children[1].addClickListener(() => {
                this.versions[0] = this.markupEditor.getValue();
                this.setLeftIndex(this.leftTextSelector.getIndex());
                this.setRightIndex(this.rightTextSelector.getIndex());
                //this.diffWidget.diffGutterPanel.scroll();
            });

            let updateEditable = () => {
                this.leftEditable = (this.leftTextSelector.getIndex() === 0);
                this.rightEditable = (this.rightTextSelector.getIndex() === 0);
                this.diffWidget.setLeftEditable(this.leftEditable);
                this.diffWidget.setRightEditable(this.rightEditable);
            };

            this.leftTextSelector.addChangeListener(() => {
                this.diffWidget.setLeftText(this.versions[this.leftTextSelector.getIndex()]);
                updateEditable();
            });

            this.rightTextSelector.addChangeListener(() => {
                this.diffWidget.setRightText(this.versions[this.rightTextSelector.getIndex()]);
                updateEditable();
            });

            this.setLeftIndex(0);
            this.setRightIndex(1);

            //this.diffWidget.diffGutter.redraw();
        }

        window.onbeforeunload = () => {
            // Are you sure you want to close the page?
            return "";
        }
    }
}

export {ArticleEditor};
