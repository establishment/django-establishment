import {UI, TabArea, Panel} from "ui/UI";
import {GlobalStyle} from "ui/GlobalStyle";

import {EmailGatewayWidget} from "EmailGatewayWidget";
import {EmailCampaignWidget} from "EmailCampaignWidget";
import {EmailTemplateWidget} from "EmailTemplateWidget";

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
