import {UI} from "ui/UI";
import {ensure} from "../../../../stemjs/src/base/Require.js";

let katex = null;

export class Latex extends UI.Element {
    setOptions(options) {
        if (options.children?.length) {
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

    updateOptions(options) {
        const oldValue = this.options.value;
        this.setOptions(Object.assign(this.options, options));
        if (oldValue !== this.options.value) {
            this.redraw();
        }
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
        // TODO use normalized paths, fix out require hell
        ensure("/static/katex/katex.min.js", () => {
            katex = require("/static/katex/katex.min.js");
            this.updateInnerHTML();
        });
        this.applyRef();
    }
}
