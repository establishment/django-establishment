import {UI, type ElementOptions, type UIElement} from "../../../../stemjs/ui/UIBase";
import {MarkupRenderer, type MarkupRendererOptions} from "../../../../stemjs/markup/MarkupRenderer";


import {TextArea} from "../../../../stemjs/ui/input/Input";
import {SectionDivider} from "../../../../stemjs/ui/section-divider/SectionDivider";
import {Orientation} from "../../../../stemjs/ui/Constants";
import {RawCheckboxInput} from "../../../../stemjs/ui/input/Input";


export interface MarkupEditorOptions {
    classMap?: any;
    showButtons?: boolean;
    value?: any;
}

class MarkupEditor extends UI.Element {
    declare markupRenderer: MarkupRenderer;

    declare options: ElementOptions<MarkupEditorOptions>;
    declare codeEditor: TextArea;
    declare editorPanel: UIElement;
    declare rendererPanel: UIElement;
    declare sectionDivider: SectionDivider;

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
        let rendererOptions: Partial<MarkupRendererOptions> = {};
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
            buttons = <div style={{margin: 6}}>
                <span onClick={() => this.toggleEditorPanel()}>
                    <RawCheckboxInput checked />
                    Editor
                </span>
                <span onClick={() => this.togglePreviewPanel()}>
                    <RawCheckboxInput checked />
                    Preview
                </span>
            </div>;
        }

        return [
            buttons,
            <SectionDivider ref="sectionDivider" orientation={Orientation.HORIZONTAL}
                            style={{textAlign: "initial", height: "100%", width: "100%", display:"inline-block",
                                    overflow: "hidden"}}>
                <UI.Element ref="editorPanel" style={{width: "50%", height: "100%", overflow: "hidden"}}>
                    {this.getEditor()}
                </UI.Element>
                <UI.Element ref="rendererPanel" style={{width: "50%", height: "100%", overflow: "auto", padding: "10px"}}>
                    {this.getMarkupRenderer()}
                </UI.Element>
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

    toggleEditorPanel() {
        if (this.editorPanel.getWidth() === 0) {
            this.sectionDivider.expandChild(0);
        } else {
            this.sectionDivider.collapseChild(0);
        }
    }

    togglePreviewPanel() {
        if (this.rendererPanel.getWidth() === 0) {
            this.sectionDivider.expandChild(1);
        } else {
            this.sectionDivider.collapseChild(1);
        }
    }

    onMount() {
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
