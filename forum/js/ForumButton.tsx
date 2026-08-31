import {Button} from "../../../stemjs/ui/button/Button";
import {type NodeAttributes} from "../../../stemjs/ui/NodeAttributes";

import {ForumButtonStyle} from "./ForumStyle";

// Held under its own name: registering it would replace the sheet every method Button inherits reads from
export class ForumButton extends Button {
    get forumStyle() {
        return ForumButtonStyle.getInstance(this.getTheme());
    }

    extraNodeAttributes(attr: NodeAttributes) {
        attr.addClass(this.forumStyle.button);
    }
}
