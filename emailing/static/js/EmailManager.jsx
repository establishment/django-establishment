import {UI} from "UI";
import {TabArea} from "TabArea";
import {URLRouter} from "URLRouter";
import {GlobalState} from "State";
import {StateDependentElement} from "StateDependentElement";
import {EmailGatewayWidget} from "EmailGatewayWidget";
import {EmailCampaignWidget} from "EmailCampaignWidget";

class EmailManager extends UI.Panel {
    render() {
        return [
            <TabArea ref="tabArea" variableHeightPanels >
                <EmailGatewayWidget ref="emailGatewayWidget" tabHref="#gateways" title="Gateways" active />
                <EmailCampaignWidget ref="emailCampaignWidget" tabHref="#campaigns" title="Campaigns" />
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
        } else {
            this.emailGatewayWidget.dispatch("show");
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
