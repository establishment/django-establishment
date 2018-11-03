import {TerminalRoute} from "ui/UI";
import {StateDependentElement} from "ui/StateDependentElement";

import {AdminDocumentationPanel} from "./AdminDocumentationPanel";
import {DocumentationPanel} from "./DocumentationPanel"

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