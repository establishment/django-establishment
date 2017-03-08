import {composeURL} from "Fetch";

class GithubManager {
    constructor() {
        this.options = Object.assign({
            loginWindowOptions: "height=600,width=800,scrollbars=yes",
        }, window.GITHUB_MANAGER_OPTIONS || {});
    }


    static Global() {
        if (!this._Global) {
            this._Global = new GithubManager();
        }
        return this._Global;
    }

    login(callback) {
        const githubUri = "https://github.com/login/oauth/authorize";

        const rawParams = {
            client_id: this.options.clientId,
        };

        const uri = composeURL(githubUri, rawParams);
        const githubWindow = window.open(uri, "githubWindow", this.options.loginWindowOptions);

        githubWindow.onbeforeunload = callback;
    }
}

export {GithubManager};
