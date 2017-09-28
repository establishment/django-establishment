import {UI, VolatileFloatingWindow, getOffset, TextInput, TemporaryMessageArea, Button, getComputedStyle, Direction, Level, Size} from "UI";
import {Dispatchable} from "Dispatcher";
import {Ajax} from "Ajax";
import {PublicUserStore} from "UserStore";
import {UserHandle} from "UserHandle";


export class AbstractUsernameAutocomplete extends Dispatchable {
    static requestNewUsers(prefix, callback) {
        Ajax.getJSON(PublicUserStore.options.fetchURL, {
            usernamePrefix: prefix
        }).then(
            (data) => {
                let userIds = (data.state.publicuser || []).map(user => user.id);
                this.usernamePrefixCache.set(prefix, userIds);
                callback(userIds);
            },
            () => {}
        );
    }

    static loadUsersForPrefix(prefix, callback) {
        if (!prefix.length) {
            callback([]);
            return;
        }
        if (!this.usernamePrefixCache) {
            this.usernamePrefixCache = new Map();
        }
        if (this.usernamePrefixCache.has(prefix)) {
            callback(this.usernamePrefixCache.get(prefix));
            return;
        }
        for (let i = 1; i < prefix.length; i += 1) {
            let partialPrefix = prefix.substring(0, i);
            if (this.usernamePrefixCache.has(partialPrefix) &&
                    this.usernamePrefixCache.get(partialPrefix).length === 0) {
                callback([]);
                return;
            }
        }
        this.requestNewUsers(prefix, callback);
    }
}

export class AutocompleteWindow extends VolatileFloatingWindow {
    extraNodeAttributes(attr) {
        attr.setStyle("z-index", "9999");
    }

    getDefaultOptions() {
        return {
            direction: Direction.UP,
            userDivHeight: 25,
            maxHeight: 300,
            highlightColor: "rgb(230, 230, 230)",
        };
    }

    setOptions(options) {
        options = Object.assign(this.getDefaultOptions(), options);
        let height = Math.min(options.maxHeight, options.userIds.length * options.userDivHeight);
        options.offsets = getOffset(options.parentNode);
        options.style = Object.assign({
            marginBottom: "5px",
            border: "1px solid black",
            position: "absolute",
            backgroundColor: "white",
            maxHeight: options.maxHeight + "px",
            overflow: "auto",
            boxShadow: "0 6px 12px rgba(0,0,0,.175)",
            top: options.offsets.top - height + "px",
            left: options.offsets.left + "px"
        }, options.style || {});
        if (options.direction === Direction.DOWN) {
            options.style.top = parseInt(options.style.top) + height
                                    + parseInt(getComputedStyle(options.parentNode, "height")) + "px";
        }
        super.setOptions(options);
    }

    render() {
        this.userDivs = [];
        for (let userId of this.options.userIds) {
            this.userDivs.push(<div userId={userId} style={{
                                                "padding": "0 5px",
                                                "border": "1px solid grey",
                                                "height": this.options.userDivHeight + "px",
                                                "line-height": this.options.userDivHeight + "px",
                                                "cursor": "pointer"
                                    }} >
                <UserHandle userId={userId} disableClick />
            </div>);
        }
        return this.userDivs;
    }

    moveIndex(delta) {
        let index = this.currentIndex;
        index += delta;
        if (index === this.userDivs.length) {
            index -= this.userDivs.length;
        }
        if (index < 0) {
            index += this.userDivs.length;
        }
        this.setCurrentIndex(index);
    }

    getCurrentUserId() {
        return this.userDivs[this.currentIndex].options.userId;
    }

    setCurrentIndex(index) {
        if (this.hasOwnProperty("currentIndex")) {
            this.userDivs[this.currentIndex].setStyle("background-color", "white");
        }
        this.currentIndex = index;
        this.userDivs[this.currentIndex].setStyle("background-color", this.options.highlightColor);
        this.scrollTo(index);
    }

    onMount() {
        this.setCurrentIndex(0);

        for (let i = 0; i < this.userDivs.length; i += 1) {
            this.userDivs[i].addNodeListener("mouseover", () => {
                this.setCurrentIndex(i);
            });
            this.userDivs[i].addClickListener(() => {
                if (this.options.onChooseUser) {
                    this.options.onChooseUser(this.getCurrentUserId());
                }
            });
        }
    }

    scrollTo(index) {
        if (this.node && this.options.userDivHeight * this.userDivs.length > this.options.maxHeight) {
            this.node.scrollTop = Math.max(this.node.scrollTop, this.options.userDivHeight * (index + 1) - this.options.maxHeight);
            this.node.scrollTop = Math.min(this.node.scrollTop, this.options.userDivHeight * index);
        }
    }

    // These two methods are here in order to avoid code duplication. The "obj" argument is
    // the class whose method these functions should theoretically be (AtMentionPlugin or UserChoiceField)

    // Called whenever the class has a list of users that should be displayed in an AutocompleteWindow,
    // above the "inputField" DOM Node
    static handleAutocomplete(obj, userIds, inputField) {
        if (obj.autocompleteWindow && obj.autocompleteWindow.node) {
            obj.autocompleteWindow.destroyNode();
        }
        if (userIds.length === 0) {
            obj.duringAutocomplete = false;
            return;
        }
        obj.duringAutocomplete = true;
        obj.autocompleteWindow = AutocompleteWindow.create(document.body, {
            parentNode: inputField,
            userIds: userIds,
            onChooseUser: (userId) => {
                obj.duringAutocomplete = false;
                obj.autocompleteUser(userId);
            }
        });
    }

    // Called whenever there is a keydown event on the inputField that has a window attached, treats the cases
    // of Enter, Escape and Up/Down arrows, modifying the attached window as needed.
    static handleKeydownEvent(obj, event) {
        if (event.key === "Enter" || event.keyCode === 13) { // Enter key
            if (obj.duringAutocomplete) {
                obj.duringAutocomplete = false;
                obj.autocompleteUser(obj.autocompleteWindow.getCurrentUserId());
                event.preventDefault();
            }
        }
        if (event.keyCode === 27) { // Escape key
            obj.duringAutocomplete = false;
            obj.dispatch("autocomplete", []);
        }
        if (event.keyCode === 38 || event.keyCode === 40) { // Up and down arrows
            if (obj.autocompleteWindow) {
                obj.autocompleteWindow.moveIndex(event.keyCode - 39);
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }
}

export class UserInputField extends UI.Element {
    render() {
        return [
            <TextInput ref="usernameInput" />,
            <Button ref="submitButton" level={Level.PRIMARY} size={Size.EXTRA_SMALL}
                    faIcon="check" style={{marginLeft: "5px"}} />,
            <TemporaryMessageArea ref="errorArea" />
        ];
    }

    getUserId() {
        let username = this.usernameInput.getValue();
        for (let user of PublicUserStore.all()) {
            if (user.name === username || user.username === username) {
                return user.id;
            }
        }
        return parseInt(username);
    }

    autocompleteUser(userId) {
        this.usernameInput.setValue(PublicUserStore.get(userId).username);
        this.dispatch("autocomplete", []);
    }

    clear() {
        this.usernameInput.setValue("");
        this.duringAutocomplete = false;
        this.dispatch("autocomplete", []);
    }

    handleChange() {
        let prefix = this.usernameInput.getValue();
        AbstractUsernameAutocomplete.loadUsersForPrefix(prefix, (userIds) => {
            this.dispatch("autocomplete", userIds);
        });
    }

    onMount() {
        this.usernameInput.addNodeListener("keydown", (event) => {
            AutocompleteWindow.handleKeydownEvent(this, event);
        });
        this.usernameInput.addNodeListener("input", () => {
            this.handleChange();
        });
        this.addListener("autocomplete", (userIds) => {
            AutocompleteWindow.handleAutocomplete(this, userIds, this.usernameInput);
        });

        this.submitButton.addClickListener(() => {
            if (this.getUserId()) {
                this.dispatch("user", this.getUserId());
            } else {
                this.errorArea.showMessage("Invalid username. Please try again.");
            }
        });
    }
}
