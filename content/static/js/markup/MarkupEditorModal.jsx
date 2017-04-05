import {UI, Button, Link, Modal} from "UI";
import {MarkupEditor} from "MarkupEditor";

class MarkupEditorModal extends Modal {
    getMarkupEditorStyle() {
        return {
            height: "85%",
            border: "solid 5px #DDD",
            "border-radius": "10px"
        };
    }

    getButtonStyle() {
        return {
            margin: "5px"
        }
    }

    setOptions(options) {
        super.setOptions(options);
        this.options.height = this.options.height || "85%";
        this.options.width = "80%";
    }

    getGivenChildren() {
        return [
            <MarkupEditor ref={this.refLink("markupEditor")} classMap={this.options.classMap} showButtons={false} style={this.getMarkupEditorStyle()}/>,
            <div ref={this.refLink("buttonPanel")} style={{"text-align": "center"}} >
                <Button ref="graphExample" label="Graph"
                           onClick={() => {this.appendGraphExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="submissionExample" label="Submission"
                           onClick={() => {this.appendSubmissionExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="codeSnippetExample" level={UI.Level.DEFAULT} size={UI.Size.DEFAULT} label="Code"
                           onClick={() => {this.appendCodeExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="linkExample" level={UI.Level.DEFAULT} size={UI.Size.DEFAULT} label="Link"
                           onClick={() => {this.appendLinkExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="latexExample" level={UI.Level.DEFAULT} size={UI.Size.DEFAULT} label="LaTeX"
                           onClick={() => {this.appendLatexExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref={this.refLink("doneButton")} level={UI.Level.PRIMARY} label="Done"
                           className="pull-right" style={this.getButtonStyle()}/>
            </div>,
            //<Button ref="userExample" level={UI.Level.DEFAULT} size={UI.Size.DEFAULT} label="User"
            //           onClick={() => {this.appendUserExample()}} style={this.getButtonStyle()} className="pull-left"/>
            <div className="" style={{"position":"absolute", "width":"90%", "margin-top":"45px"}}>
                <Link href="/about/#markup" value="More details here" />
            </div>
        ];
    }

    appendLatexExample() {
        this.markupEditor.appendValue("<Latex value=\"\\lim_{x\\to\\infty} f(x)\"/>");
    }

    appendGraphExample() {
        this.markupEditor.appendValue("<Graph nodes={[{}, {}, {}]} edges={[{source:1, target:2}]} directed />");
    }

    appendSubmissionExample() {
        this.markupEditor.appendValue("<Submission id={25717} />");
    }

    appendCodeExample() {
        this.markupEditor.appendValue(
            "```java\n" +
            "class Main {\n" +
            "    public static void main (String[] args) throws java.lang.Exception {\n" +
            "        System.out.println(\"42\");\n" +
            "    }\n" +
            "}\n" +
            "```");
    }

    appendUserExample() {
        this.markupEditor.appendValue("<User id={1} />");
    }

    appendLinkExample() {
        this.markupEditor.appendValue("<Link href=\"https://csacademy.com\" value=\"Cool website\" newTab/>");
    }

    hide() {
        super.hide();
        if(this.options.hideCallback) {
            this.options.hideCallback();
        }
    }

    show() {
        super.show();
        if (this.options.showCallback) {
            this.options.showCallback();
        }
    }

    onMount() {
        super.onMount();
        this.doneButton.addClickListener(() => {
            this.hide();
        });
    }
}

export {MarkupEditorModal};
