import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {TabArea} from "../../../stemjs/src/ui/tabs/TabArea.jsx";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {GlobalStyle} from "../../../stemjs/src/ui/GlobalStyle.js";

import {EmailGatewayWidget} from "./EmailGatewayWidget.jsx";
import {EmailCampaignWidget} from "./EmailCampaignWidget.jsx";
import {EmailTemplateWidget} from "./EmailTemplateWidget.jsx";

class EmailManager extends Panel {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(GlobalStyle.Container.SMALL);
    }

    getUrlPrefix(urlPart) {
        let url = "/email/manager/";
        if (urlPart) {
            url += urlPart + "/";
        }
        return url;
    }

    setURL(urlParts) {
        if (this.tabArea) {
            this.showUrlTab(urlParts[0] || "campaigns");
        } else {
            this.initialUrlParts = urlParts;
        }
    }

    render() {
        return [
            <TabArea ref="tabArea" variableHeightPanels >
                <EmailCampaignWidget ref="campaignsWidget" tabHref={this.getUrlPrefix("campaigns")} title="Campaigns" active/>
                <EmailTemplateWidget ref="templatesWidget" tabHref={this.getUrlPrefix("templates")} title="Templates"/>
                <EmailGatewayWidget ref="gatewaysWidget" tabHref={this.getUrlPrefix("gateways")} title="Gateways"/>
            </TabArea>
        ];
    }

    onMount() {
        this.setURL(this.initialUrlParts);
        delete this.initialUrlPars;
    }

    showUrlTab(urlPart) {
        if (this[urlPart + "Widget"]) {
            this[urlPart + "Widget"].dispatch("show");
        } else {
            this.campaignsWidget.dispatch("show");
        }
    }
}

export {EmailManager};
