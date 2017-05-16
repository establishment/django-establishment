import {UI} from "UI";
import {EmailGatewayStore} from "EmailGatewayStore";
import {EmailCampaignStore} from "EmailCampaignStore";
import {EmailTemplateStore} from "EmailTemplateStore";

class EmailCampaignWidget extends UI.Panel {
    constructor(options) {
        super(options);
    }

    onMount() {
        super.onMount();

        EmailGatewayStore.registerStreams();
        EmailCampaignStore.registerStreams();
        EmailTemplateStore.registerStreams();
    }

    render() {
        return <p>Email Campaigns</p>;
    }
}

export {EmailCampaignWidget};
