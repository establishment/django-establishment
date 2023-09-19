import {UI} from "../../../stemjs/src/ui/UIBase.js";

import {BasePopup} from "./Popup.jsx";


export class PopupSpan extends UI.Primitive("span") {
    getChildrenToRender() {
        return [
            <div ref="content">
                {this.render()}
            </div>
        ];
    }

    onMount() {
        this.content.addNodeListener("mouseover", () => {
            let content = this.options.popupContent;
            if (typeof content === "function") {
                content = content();
            }
            this.popup = BasePopup.create(this.content, Object.assign({
                target: this.content,
                children: content,
                transitionTime: 300,
                titleFontSize: "10pt",
                contentStyle: {
                    padding: "0 0 0 5px",
                    textAlign: "left"
                },
                style: {
                    minWidth: "100px",
                    maxWidth: "300px"
                }
            }, this.options.popupOptions || {}));
        });
        this.content.addNodeListener("mouseout", () => {
            if (this.popup) {
                this.popup.hide();
            }
        })
    }
}