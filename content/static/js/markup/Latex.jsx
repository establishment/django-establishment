import {UI} from "UI";


let katex = null;

export class Latex extends UI.Element {
    setOptions(options) {
        if (options.children && options.children.length) {
            let value = "";
            for (let child of options.children) {
                if (child instanceof UI.TextElement) {
                    value += child.getValue();
                } else {
                    value += child.toString();
                }
            }
            options.value = options.value || value;
        }
        super.setOptions(options);
    }

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
}
