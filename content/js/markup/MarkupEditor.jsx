import {UI, Panel, Button, CodeEditor, SectionDivider, ButtonGroup, TextArea, Orientation, Level} from "UI";
import {MarkupRenderer} from "markup/MarkupRenderer";


class MarkupEditor extends Panel {
    getDefaultOptions() {
        return {
            showButtons: true
        };
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
        return <TextArea ref="codeEditor" style={{
            width: "100%",
            height: "calc(100% - 3px)",
            resize: "none",
            backgroundColor: "#F9F9F9"
        }} value={this.options.value || ""}/>;
    }

    render() {
        let buttons;
        if (this.options.showButtons) {
            buttons = <ButtonGroup>
                <Button ref="toggleLeftButton" label={UI.T("Editor")} level={Level.SUCCESS}/>
                <Button ref="toggleRightButton" label={UI.T("Article")} level={Level.SUCCESS}/>
            </ButtonGroup>;
        }

        return [
            buttons,
            <SectionDivider ref="sectionDivider" orientation={Orientation.HORIZONTAL}
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

    appendValue(markup, separator="\n") {
        let value = this.getValue();
        if (value && separator != null) {
            value += separator;
        }
        value += markup;
        this.setValue(value);
        this.updateValue(value);
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

    onMount() {
        if (this.options.showButtons) {
            this.toggleLeftButton.addClickListener(() => {
                if (this.editorPanel.getWidth() === 0) {
                    this.sectionDivider.expandChild(0);
                    this.toggleLeftButton.setLevel(Level.SUCCESS);
                } else {
                    this.sectionDivider.collapseChild(0);
                    this.toggleLeftButton.setLevel(Level.DANGER);
                }
            });
            this.toggleRightButton.addClickListener(() => {
                if (this.rendererPanel.getWidth() === 0) {
                    this.sectionDivider.expandChild(1);
                    this.toggleRightButton.setLevel(Level.SUCCESS);
                } else {
                    this.sectionDivider.collapseChild(1);
                    this.toggleRightButton.setLevel(Level.DANGER);
                }
            });
        }

        this.setEditorOptions();
    }

    getValue() {
        return this.codeEditor.getValue();
    }

    setValue(value) {
        this.updateValue(value);
        return this.codeEditor.setValue(value);
    }
}

export {MarkupEditor};
