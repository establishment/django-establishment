import {Route, TerminalRoute} from "Router";
import {StateDependentElement} from "StateDependentElement";

import {DocumentationPanel} from "./DocumentationPanel"
import {AdminDocumentationPanel} from "./AdminDocumentationPanel";

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