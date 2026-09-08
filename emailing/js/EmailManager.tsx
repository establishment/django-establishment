import {UI, type NodeAttributes, type UIElement} from "../../../stemjs/ui/UIBase";
import {TabArea} from "../../../stemjs/ui/tabs/TabArea";
import {GlobalStyle} from "../../../stemjs/ui/GlobalStyle";

import {EmailGatewayWidget} from "./EmailGatewayWidget";
import {EmailCampaignWidget} from "./EmailCampaignWidget";
import {EmailTemplateWidget} from "./EmailTemplateWidget";

class EmailManager extends UI.Element {
    declare initialUrlParts: string[];
    declare tabArea: TabArea;
    // One tab per url part, which is how showUrlTab finds the one to open
    tabWidgets: Record<string, UIElement> = {};

    extraNodeAttributes(attr: NodeAttributes) {
        super.extraNodeAttributes(attr);
        attr.addClass(GlobalStyle.Container.sm);
    }

    getUrlPrefix(urlPart: string) {
        let url = "/email/manager/";
        if (urlPart) {
            url += urlPart + "/";
        }
        return url;
    }

    setURL(urlParts: string[]) {
        if (this.tabArea) {
            this.showUrlTab(urlParts[0] || "campaigns");
        } else {
            this.initialUrlParts = urlParts;
        }
    }

    render() {
        return [
            <TabArea ref="tabArea">
                <EmailCampaignWidget ref={{parent: this.tabWidgets, name: "campaigns"}} tabHref={this.getUrlPrefix("campaigns")} title="Campaigns" active/>
                <EmailTemplateWidget ref={{parent: this.tabWidgets, name: "templates"}} tabHref={this.getUrlPrefix("templates")} title="Templates"/>
                <EmailGatewayWidget ref={{parent: this.tabWidgets, name: "gateways"}} tabHref={this.getUrlPrefix("gateways")} title="Gateways"/>
            </TabArea>
        ];
    }

    onMount() {
        this.setURL(this.initialUrlParts);
        delete this.initialUrlParts;
    }

    showUrlTab(urlPart: string) {
        const widget = this.tabWidgets[urlPart] || this.tabWidgets.campaigns;
        widget.dispatch("show");
    }
}

export {EmailManager};
