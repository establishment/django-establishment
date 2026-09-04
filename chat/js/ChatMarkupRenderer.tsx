import {MarkupClassMap, MarkupRenderer} from "../../../stemjs/markup/MarkupRenderer";

class ChatMarkupRenderer extends MarkupRenderer {
    declare static classMap: MarkupClassMap;

    setOptions(options: typeof this.options) {
        options.classMap = this.constructor.classMap;
        super.setOptions(options);
    }
}

ChatMarkupRenderer.classMap = new MarkupClassMap(MarkupClassMap.GLOBAL);

export {ChatMarkupRenderer};
