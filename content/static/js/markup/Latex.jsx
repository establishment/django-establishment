import {UI} from "UI";
import "MarkupRenderer";

let katex = null;

UI.Latex = class Latex extends UI.Element {
    getNodeType() {
        return "span";
    }

    updateInnerHTML() {
        try {
            this.node.innerHTML = katex.renderToString(this.options.value);
        } catch(e) {
            this.node.innerHTML = "Latex parse error...";
        }
    }
    
    redraw() {
        if (katex) {
            this.updateInnerHTML();
            return;
        }
        require(["katex"], (_katex) => {
            katex = _katex;
            this.updateInnerHTML();
        });
    }
};

function registerMarkup(markupClassMap) {
    markupClassMap.addClass("Latex", UI.Latex);
}

export {registerMarkup}
