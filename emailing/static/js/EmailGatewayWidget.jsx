import {UI} from "UI";
import {EmailGatewayStore} from "EmailGatewayStore";

class EmailGatewayWidget extends UI.Panel {
    constructor(options) {
        super(options);
    }

    onMount() {
        super.onMount();

        EmailGatewayStore.registerStreams();
    }

    render() {
        console.log(EmailGatewayStore.all());
        return <p>Email Gateways</p>;
    }
}

export {EmailGatewayWidget};
