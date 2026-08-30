import {UI, type ElementOptions, type UIElement} from "../../../stemjs/ui/UIBase";

import {BasePopup} from "./Popup";


export interface PopupSpanOptions {
    popupContent?: any;
    popupOptions?: any;
}

export class PopupSpan extends UI.Primitive("span") {
    declare options: ElementOptions<PopupSpanOptions>;
    declare content: UIElement;
    declare popup: any;

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