import {UI} from "../../../../stemjs/src/ui/UIBase.js";
import katex from "../../static/katex/katex.mjs"; // TODO upgrade Katex dependency

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
    
    redraw() {
        super.redraw();
        this.node.innerHTML = katex.renderToString(this.options.value, {
            throwOnError: false
        });
    }
}
