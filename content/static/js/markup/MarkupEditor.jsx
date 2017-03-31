import {UI, SectionDivider} from "UI";
import {Dispatcher} from "Dispatcher";
import "MarkupRenderer";


// class SimpleCodeEditor extends UI.Element {
class SimpleCodeEditor extends UI.TextArea {

    addChangeListener(callback) {
        super.addChangeListener(callback);
        this.onInput(callback);
        this.onKeyUp(callback);
    }

    // Inserts the text at the current cursor position
    insert(text) {
        throw Error("Insert not implemented");
    }

    // Appends the text at the end of the document
    append(text) {
        throw Error("Append not implemented");
    }
}

class MarkupEditor extends UI.Panel {
    setOptions(options) {
        super.setOptions(options);
        this.options.showButtons = typeof this.options.showButtons === "undefined" ? true : this.options.showButtons;
    }

    getMarkupRenderer() {
        let rendererOptions = {};
        if (this.options.classMap) {
            rendererOptions.classMap = this.options.classMap;
        }
        return <UI.MarkupRenderer ref={this.refLink("markupRenderer")} value={this.options.value} style={{height:"100%", overflow: "auto"}} {...rendererOptions} />;
    }

    render() {
        // let panelStyle = {display: "inline-block", verticalAlign: "top", width: "45%", height: "100%", overflow: "auto"};
        let panelStyle = {display: "inline-block", width: "100%", height: "100%", overflow: "auto"};

        return [
            <SectionDivider ref="sectionDivider" orientation={UI.Orientation.HORIZONTAL}
                               style={{height: "100%", width: "100%", display:"inline-block"}}>
                <UI.Panel ref="editorPanel" title="Editor" style={panelStyle}>
                    <SimpleCodeEditor ref="codeEditor" style={{height:"100%", width:"100%", resize: "none"}} value={this.options.value}/>
                </UI.Panel>
                <UI.Panel ref="rendererPanel" title="Preview" style={panelStyle}>
                    {this.getMarkupRenderer()}
                </UI.Panel>
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

    onMount() {
        if (this.codeEditor) {
            this.codeEditor.addChangeListener((event) => {
                try {
                    this.refreshMarkup();
                } catch (e) {
                    console.error("Exception in parsing markup: ", e);
                }
            });

            //refresh the markup after the text has been imported
            //TODO @ericpts: apparently setTimeout(0) is an anti-pattern
            setTimeout(() => {this.refreshMarkup()}, 0);
        }

    }

    getValue() {
        return this.codeEditor.getValue();
    }

    refreshMarkup() {
        this.updateValue(this.getValue());
    }


    setValue(value) {
        return this.codeEditor.setValue(value);
    }
}

export {MarkupEditor};
