import {composeURL} from "../../../../stemjs/base/Fetch";
import {SocialApp} from "../../../socialaccount/js/state/SocialAppStore";
import {SocialAccountManager} from "../../../socialaccount/js/SocialAccountManager";

class GithubManager extends SocialAccountManager {
    constructor() {
        super(SocialApp.getSocialAppByName("Github"), {
            loginWindowOptions: "height=600,width=800,scrollbars=yes",
        });
    }

    login(callback) {
        const githubUri = "https://github.com/login/oauth/authorize";

        const params = new URLSearchParams({
            client_id: this.getClientId(),
        });

        const uri = composeURL(githubUri, params);
        const githubWindow = window.open(uri, "githubWindow", this.options.loginWindowOptions);

        githubWindow.onbeforeunload = callback;
    }
}

export {GithubManager};
