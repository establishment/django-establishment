import {composeURL} from "Fetch";

class GithubManager {

    static Global() {
        if (!this._Global) {
            this._Global = new GithubManager();
        }
        return this._Global;
    }

    login(callback) {
        const githubUri = "https://github.com/login/oauth/authorize";

        const rawParams = {
            client_id: "6ee28fb2ccbb39eb6503",
        };

        const uri = composeURL(githubUri, rawParams);
        const githubWindow = window.open(uri, "githubWindow", "height=600,width=800,scrollbars=yes");

        githubWindow.onbeforeunload = callback;
    }
}

export {GithubManager};
