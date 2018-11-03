import {composeURL} from "base/Fetch";
import {SocialAppStore} from "state/SocialAppStore";
import {SocialAccountManager} from "SocialAccountManager";

class GithubManager extends SocialAccountManager {
    constructor() {
        super(SocialAppStore.getSocialAppByName("Github"), {
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
