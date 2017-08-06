import {UI} from "UI";
import {MarkupClassMap, MarkupRenderer} from "markup/MarkupRenderer";

class ChatMarkupRenderer extends MarkupRenderer {
    setOptions(options) {
        options.classMap = this.constructor.classMap;
        super.setOptions(options);
    }
}

ChatMarkupRenderer.classMap = new MarkupClassMap(MarkupClassMap.GLOBAL);

export {ChatMarkupRenderer};
