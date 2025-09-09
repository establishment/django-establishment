import {composeURL} from "../../../../stemjs/base/Fetch.js";
import {SocialApp} from "../../../socialaccount/js/state/SocialAppStore";
import {SocialAccountManager} from "../../../socialaccount/js/SocialAccountManager.js";

class GithubManager extends SocialAccountManager {
    constructor() {
        super(SocialApp.getSocialAppByName("Github"), {
            loginWindowOptions: "height=600,width=800,scrollbars=yes",
        });
    }

    login(callback) {
        const githubUri = "https://github.com/login/oauth/authorize";

        const rawParams = {
            client_id: this.getClientId(),
        };

        const uri = composeURL(githubUri, rawParams);
        const githubWindow = window.open(uri, "githubWindow", this.options.loginWindowOptions);

        githubWindow.onbeforeunload = callback;
    }
}

export {GithubManager};
