import {UI, Button, Link, Modal, Level, Size, Direction} from "UI";
import {MarkupEditor} from "./MarkupEditor";
import {BasePopup} from "../Popup";
// import {Emoji as EmojiMini} from "EmojiMini";
// import "EmojiUI";

UI.Emoji = UI.Emoji || UI.Element;

class ClickableEmote extends UI.Emoji {
    redraw() {
        this.redrawTimeout = setTimeout(()=> super.redraw());
    }

    onMount() {
        this.addClickListener(() => {
            const textBox = this.options.textBox;
            if (textBox) {
                textBox.appendValue(this.getValueText(), " ");
            }
            if (this.options.afterClick) {
                this.options.afterClick();
            }
        });
    }

    onUnmount() {
        clearTimeout(this.redrawTimeout);
    }
}

class ClickableEmoji extends ClickableEmote {
    getValueText() {
        return ":" + this.options.value + ":";
    }
}

class ClickableTwitchEmote extends ClickableEmote {
    getValueText() {
        return this.options.value;
    }
}

class EmojiButton extends Button {
    getPopup() {
        const textBox = this.options.getTextBox();
        const afterClick = () => this.closePopup();
        let emotesList = [];
        for (let emoji in EmojiMini.EMOJI) {
            emotesList.push(<ClickableEmoji textBox={textBox} afterClick={afterClick} value={emoji}/>);
        }
        for (let twitchEmoji in EmojiMini.TWITCH_EMOTICONS) {
            emotesList.push(<ClickableTwitchEmote textBox={textBox} afterClick={afterClick} value={twitchEmoji}/>);
        }
        return BasePopup.create(this.parent, {
                target: this,
                children: emotesList,
                arrowDirection: Direction.DOWN,
                style: {
                    display: "flex",
                    overflow: "auto",
                    height: "300px",
                    width: "300px",
                }
            });
    }

    closePopup() {
        if (this.emojiPopup) {
            this.emojiPopup.destroyNode();
            delete this.emojiPopup;
        }
    }

    onMount() {
        this.addClickListener(() => {
            if (this.emojiPopup) {
                this.closePopup();
            } else {
                this.emojiPopup = this.getPopup();
            }
        })
    }

    onUnmount() {
        this.closePopup();
    }
}

class MarkupEditorModal extends Modal {
    getDefaultOptions() {
        return Object.assign(super.getDefaultOptions(), {
            height: "85%",
            width: "80%",
            destroyOnHide: false
        });
    }

    getMarkupEditorStyle() {
        return {
            height: "85%",
            border: "solid 5px #DDD",
            borderRadius: "10px"
        };
    }

    getButtonStyle() {
        return {
            margin: "5px"
        }
    }

    render() {
        return [
            <MarkupEditor ref={this.refLink("markupEditor")} classMap={this.options.classMap} showButtons={false} style={this.getMarkupEditorStyle()}/>,
            <div ref={this.refLink("buttonPanel")} style={{"text-align": "center"}} >
                <Button ref="graphExample" label="Graph"
                           onClick={() => {this.appendGraphExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="submissionExample" label="Submission"
                           onClick={() => {this.appendSubmissionExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="codeSnippetExample" level={Level.DEFAULT} size={Size.DEFAULT} label="Code"
                           onClick={() => {this.appendCodeExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="linkExample" level={Level.DEFAULT} size={Size.DEFAULT} label="Link"
                           onClick={() => {this.appendLinkExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref="latexExample" level={Level.DEFAULT} size={Size.DEFAULT} label="LaTeX"
                           onClick={() => {this.appendLatexExample()}} style={this.getButtonStyle()} className="pull-left"/>
                <Button ref={this.refLink("doneButton")} level={Level.PRIMARY} label="Done"
                           className="pull-right" style={this.getButtonStyle()}/>
            </div>,
            //<span ref={this.refLink("emotesContainer")} style={{float: "left", position: "relative", margin: "5px"}}>
            //    <EmojiButton ref="emotes" level={Level.DEFAULT} size={Size.DEFAULT} label="Emoticons" getTextBox={() => this.markupEditor}/>
            //</span>
            //<Button ref="userExample" level={Level.DEFAULT} size={Size.DEFAULT} label="User"
            //           onClick={() => {this.appendUserExample()}} style={this.getButtonStyle()} className="pull-left"/>
            <div className="" style={{"position":"absolute", "width":"90%", "margin-top":"45px"}}>
                <Link href="/about/#markup" value="More details here" />
            </div>
        ];
    }

    appendLatexExample() {
        this.markupEditor.appendValue("$$lim_{x\\to\\infty} f(x)$$");
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
        if (this.options.hideCallback) {
            this.options.hideCallback(this);
        }
    }

    show() {
        super.show();
        if (this.options.showCallback) {
            this.options.showCallback(this);
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
