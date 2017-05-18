import {UI} from "UI";
import {TabArea} from "TabArea";
import {URLRouter} from "URLRouter";
import {GlobalState} from "State";
import {StateDependentElement} from "StateDependentElement";
import {EmailGatewayWidget} from "EmailGatewayWidget";
import {EmailCampaignWidget} from "EmailCampaignWidget";
import {EmailTemplateWidget} from "EmailTemplateWidget";

class EmailManager extends UI.Panel {
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

class DelayedEmailManager extends StateDependentElement(EmailManager) {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setStyle({
            marginLeft: "10%",
            marginRight: "10%",
            marginTop: "20px",
        });
    }

    getAjaxUrl() {
        return location.pathname;
    }

    importState(data) {
        super.importState(data);
        this.options.confirmSuccess = data.confirmSuccess;
    }
}

export {EmailManager, DelayedEmailManager};
