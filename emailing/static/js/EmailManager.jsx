import {UI} from "UI";
import {TabArea} from "TabArea";
import {URLRouter} from "URLRouter";
import {GlobalState} from "State";
import {EmailGatewayWidget} from "EmailGatewayWidget";
import {EmailCampaignWidget} from "EmailCampaignWidget";
import {EmailTemplateWidget} from "EmailTemplateWidget";
import {GlobalStyle} from "GlobalStyle";

class EmailManager extends UI.Panel {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(GlobalStyle.Container.SMALL);
    }

    render() {
        return [
            <TabArea ref="tabArea" variableHeightPanels >
                <EmailCampaignWidget ref="emailCampaignWidget" tabHref="#campaigns" title="Campaigns" active/>
                <EmailTemplateWidget ref="emailTemplateWidget" tabHref="#templates" title="Templates"/>
                <EmailGatewayWidget ref="emailGatewayWidget" tabHref="#gateways" title="Gateways"/>
            </TabArea>
        ];
    }

    onMount() {
        super.onMount();

        this.showUrlTab(URLRouter.getLocation());
        URLRouter.addRouteListener((location) => this.showUrlTab(location));
    }

    showUrlTab(location) {
        if (location.args[0] === "gateways") {
            this.emailGatewayWidget.dispatch("show");
        } else if (location.args[0] === "campaigns") {
            this.emailCampaignWidget.dispatch("show");
        } else if (location.args[0] === "templates") {
            this.emailTemplateWidget.dispatch("show");
        } else {
            this.emailCampaignWidget.dispatch("show");
        }
    }
}

export {EmailManager};
