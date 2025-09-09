import {TerminalRoute} from "../../../stemjs/ui/Router.jsx";
import {StateDependentElement} from "../../../stemjs/ui/StateDependentElement.jsx";

import {AdminDocumentationPanel} from "./AdminDocumentationPanel.jsx";
import {DocumentationPanel} from "./DocumentationPanel.jsx";

// Particular case for /docs/ and /docs/edit/
export class DocumentationRoute extends TerminalRoute {
    constructor() {
        super("docs", StateDependentElement(DocumentationPanel), "Documentation");
        this.subroutes = [
            new TerminalRoute("edit", StateDependentElement(AdminDocumentationPanel), [], "Edit Documentation")
        ];
    }

    matchesOwnNode(urlParts) {
        return urlParts.length === 0 || urlParts[0] !== "edit";
    }
}