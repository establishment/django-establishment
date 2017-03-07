import {UI} from "UI";
import "MarkupRenderer";

class ChatMarkupRenderer extends UI.MarkupRenderer {
    setOptions(options) {
        options.classMap = this.constructor.classMap;
        super.setOptions(options);
    }
}

ChatMarkupRenderer.classMap = new UI.MarkupClassMap(UI.MarkupClassMap.GLOBAL);

export {ChatMarkupRenderer};
