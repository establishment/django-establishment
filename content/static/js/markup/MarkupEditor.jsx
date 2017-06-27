import {UI, Panel, Button, CodeEditor, SectionDivider} from "UI";
import {MarkupRenderer} from "markup/MarkupRenderer";

class MarkupEditor extends Panel {
    setOptions(options) {
        super.setOptions(options);
        this.options.showButtons = typeof this.options.showButtons === "undefined" ? true : this.options.showButtons;
    }

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setStyle("textAlign", "center");
    }

    getMarkupRenderer() {
        let rendererOptions = {};
        if (this.options.classMap) {
            rendererOptions.classMap = this.options.classMap;
        }
        return <MarkupRenderer ref={this.refLink("markupRenderer")} value={this.options.value} style={{height:"100%", overflow: "auto"}} {...rendererOptions} />;
    }

    getEditor() {
        return <CodeEditor ref="codeEditor" lineWrapping style={{height:"100%"}} value={this.options.value} aceMode="text" />;
    }

    render() {
        let buttons;
        if (this.options.showButtons) {
            buttons = <UI.ButtonGroup>
                <Button ref="toggleLeftButton" label={UI.T("Editor")} level={UI.Level.SUCCESS}/>
                <Button ref="toggleRightButton" label={UI.T("Article")} level={UI.Level.SUCCESS}/>
            </UI.ButtonGroup>;
        }

        return [
            buttons,
            <SectionDivider ref="sectionDivider" orientation={UI.Orientation.HORIZONTAL}
                            style={{textAlign: "initial", height: "100%", width: "100%", display:"inline-block",
                                    overflow: "hidden"}}>
                <Panel ref="editorPanel" style={{width: "50%", height: "100%", overflow: "hidden"}}>
                    {this.getEditor()}
                </Panel>
                <Panel ref="rendererPanel" style={{width: "50%", height: "100%", overflow: "auto", padding: "10px"}}>
                    {this.getMarkupRenderer()}
                </Panel>
            </SectionDivider>
        ]
    }

    updateValue(markup) {
        this.markupRenderer.setValue(markup);
        this.markupRenderer.redraw();
    }

    appendValue(markup) {
        let value = this.getValue();
        if (value) {
            value += "\n";
        }
        value += markup;
        this.setValue(value);
        this.updateValue(value);
    }

    setEditorOptions() {
        this.codeEditor.ace.setOption("indentedSoftWrap", false);
        this.codeEditor.ace.getSession().addEventListener("change", (event) => {
            let markup = this.codeEditor.getValue();
            try {
                this.updateValue(markup);
            } catch (e) {
                console.error("Exception in parsing markup: ", e);
            }
        });
    }

    onMount() {
        if (this.options.showButtons) {
            this.toggleLeftButton.addClickListener(() => {
                if (this.editorPanel.getWidth() === 0) {
                    this.sectionDivider.expandChild(0);
                    this.toggleLeftButton.setLevel(UI.Level.SUCCESS);
                } else {
                    this.sectionDivider.collapseChild(0);
                    this.toggleLeftButton.setLevel(UI.Level.DANGER);
                }
            });
            this.toggleRightButton.addClickListener(() => {
                if (this.rendererPanel.getWidth() === 0) {
                    this.sectionDivider.expandChild(1);
                    this.toggleRightButton.setLevel(UI.Level.SUCCESS);
                } else {
                    this.sectionDivider.collapseChild(1);
                    this.toggleRightButton.setLevel(UI.Level.DANGER);
                }
            });
        }

        this.setEditorOptions();
    }

    getValue() {
        return this.codeEditor.getValue();
    }

    setValue(value) {
        return this.codeEditor.setValue(value);
    }
}

export {MarkupEditor};
