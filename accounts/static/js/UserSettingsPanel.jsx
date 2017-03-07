import {Ajax} from "Ajax";
import {UI} from "UI";
import {TabArea} from "tabs/TabArea";
import {UserStore} from "UserStore";
import {FacebookManager} from "FacebookManager";
import {GoogleManager} from "GoogleManager";

class GeneralInformationPanel extends UI.Panel {
    render() {
        return [
            <h3>General Info</h3>,
            <div>
                <UI.Form>
                    <UI.FormGroup ref="firstNameFormGroup" label="First Name">
                        <UI.TextInput ref="firstNameFormInput" maxLength={this.options.user.validators.first_name_max_length} placeholder="John" value={this.options.user.firstName}/>
                    </UI.FormGroup>
                    <UI.FormGroup ref="lastNameFormGroup" label="Last Name">
                        <UI.TextInput ref="lastNameFormInput" maxLength={this.options.user.validators.last_name_max_length} placeholder="Smith" value={this.options.user.lastName}/>
                    </UI.FormGroup>
                    <UI.FormGroup ref="userNameFormGroup" label="Username">
                        <UI.TextInput ref="userNameFormInput" maxLength={this.options.user.validators.username_max_length} placeholder="johnsmith" value={this.options.user.username || ""}/>
                    </UI.FormGroup>
                    <UI.FormGroup ref="displayNameFormGroup" label="Display name">
                        <UI.Select ref="displayNameSelect" className="form-control" options={["Name", "Username"]}/>
                    </UI.FormGroup>
                </UI.Form>
                <UI.AjaxButton ref="saveProfileButton" level={UI.Level.PRIMARY} className="col-sm-offset-2"
                statusOptions={["Save changes", {faIcon: "spinner fa-spin", label:" Saving changes..."}, "Saved changes", "Save failed"]}/>
            </div>
        ];
    }

    onMount() {
        super.onMount();

        this.displayNameSelect.set(this.options.user.displayName ? "Name" : "Username");

        this.saveProfileButton.addClickListener(() => {
            this.saveProfileChanges();
        });

        this.userNameFormInput.onInput(() => {
            this.validateUsername();
        });
    }

    validateUsername() {
        let userName = this.userNameFormInput.getValue();
        let validators = this.options.user.validators.username_regexes;

        let usernameErrors = false;
        for (let validator of validators) {
            let usernameRegex = new RegExp(String.raw`${validator.pattern}`);
            if (!usernameRegex.test(userName)) {
                this.userNameFormGroup.setError(validator.message);
                usernameErrors = true;
            }
        }
        if (!usernameErrors) {
            this.userNameFormGroup.removeError();
            this.saveProfileButton.enable();
        } else {
            this.saveProfileButton.disable();
        }
    }

    saveProfileChanges() {
        let firstName = this.firstNameFormInput.getValue();
        let lastName = this.lastNameFormInput.getValue();
        let userName = this.userNameFormInput.getValue();
        let displayName = this.displayNameSelect.get();

        let request = {
            firstName: firstName,
            lastName: lastName,
            userName: userName,
            displayName: displayName === "Name"
        };
        console.log("sending request", request);

        this.saveProfileButton.ajaxCall({
            url: "/accounts/profile_changed/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                console.log("Profile changed", data);
                this.saveProfileButton.setFaIcon("");

                this.firstNameFormGroup.removeError();
                this.lastNameFormGroup.removeError();
                this.userNameFormGroup.removeError();

                if (data.error) {
                    console.log(data.error);
                    if (data.error.first_name) {
                        this.firstNameFormGroup.setError(data.error.first_name);
                    }
                    if (data.error.last_name) {
                        this.lastNameFormGroup.setError(data.error.last_name);
                    }
                    if (data.error.username) {
                        this.userNameFormGroup.setError(data.error.username);
                    }
                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in updating user profile:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }
}


class SecuritySettingsPanel extends UI.Panel {
    render() {
        return [
            <h3>Password</h3>,
            <div>
                <UI.Form>
                    <UI.FormGroup ref="oldPasswordGroup" label="Current Password">
                        <UI.PasswordInput ref="oldPasswordInput"/>
                    </UI.FormGroup>
                    <UI.FormGroup ref="newPasswordGroup" label="New Password">
                        <UI.PasswordInput ref="newPasswordInput" required/>
                    </UI.FormGroup>
                    <UI.FormGroup ref="newPasswordGroup2" label="New Password (again)">
                        <UI.PasswordInput ref="newPasswordInput2" required/>
                    </UI.FormGroup>
                </UI.Form>
                <UI.AjaxButton ref="setPasswordButton" level={UI.Level.PRIMARY} className="col-sm-offset-2"
                statusOptions={["Set Password", {faIcon: "spinner fa-spin", label:" Setting Password..."}, "Password set", "Failed"]}/>
            </div>
        ];
    }

    onMount() {
        super.onMount();

        debugger;
        if (!this.options.user.hasPassword) {
            this.oldPasswordGroup.hide();
        } else {
            //TODO(@gem): Add required option to oldPassword
        }

        this.setPasswordButton.addClickListener(() => {
            this.setPassword();
        });
    }

    setPassword() {
        let oldPassword = this.oldPasswordInput.getValue();
        let password1 = this.newPasswordInput.getValue();
        let password2 = this.newPasswordInput2.getValue();

        this.oldPasswordGroup.removeError();
        this.newPasswordGroup.removeError();
        this.newPasswordGroup2.removeError();
        if (password1 != password2) {
            this.newPasswordGroup2.setError("Passwords don't match.");
            return;
        }
        if (!password1) {
            this.newPasswordGroup.setError("Password can't be empty.");
            return;
        }

        let request = {
            newPassword: password1
        };
        if (oldPassword) {
            request["oldPassword"] = oldPassword;
        }

        console.log("setting password", request);

        this.setPasswordButton.ajaxCall({
            url: "/accounts/password_change/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    this.oldPasswordGroup.setError(data.error);
                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                    console.log("Password set", data);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while setting password:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }
}


class EmailPanel extends UI.Panel {
    render() {
        let emails = this.options.user.emails.slice();

        emails.sort((a, b) => {
            return a.verified == b.verified ? b.primary - a.primary : b.verified - a.verified;
        });


        let emailForms = [];
        for (let email of emails) {
            let primaryLabel, verifiedLabel, unverifiedLabel;
            let primaryAction, removeAction, resendAction; // TODO: handle onclick
            let labelStyle = {borderRadius: "10px", "margin-left": "5px"};
            let actionStyle = {"margin-left": "7px", "margin-top": "6px"};

            let makePrimaryCallback = () => {
                this.makePrimaryEmail(email.email);
            };

            let removeCallback = () => {
                this.removeEmail(email.email);
            };

            let resendCallback = () => {
                this.sendConfirmation(email.email);
            };


            if (email.verified) {
                if (email.primary) {
                    primaryLabel = <span className="primary label label-primary" style={labelStyle}>Primary</span>;
                } else {
                    verifiedLabel = <span className="verified label label-success" style={labelStyle}>Verified</span>;
                    primaryAction = <UI.Button onClick={makePrimaryCallback} size={UI.Size.EXTRA_SMALL} level={UI.Level.PRIMARY} label="Make Primary"
                                               style={actionStyle} />;
                }
            } else {
                unverifiedLabel = <span className="unverified label label-warning" style={labelStyle}>Unverified</span>;
                resendAction = <UI.Button onClick={resendCallback} size={UI.Size.EXTRA_SMALL} level={UI.Level.DEFAULT} label="Re-send confirmation"
                                          style={actionStyle} />;
            }

            if (!email.primary) {
                removeAction = <UI.Button onClick={removeCallback} size={UI.Size.EXTRA_SMALL} level={UI.Level.DANGER} label="Remove"
                                          style={actionStyle} />;
            }

            emailForms.push(
                <div className="form-group col-sm-12">
                    <label className="control-label">{email.email}</label>
                    {primaryLabel}
                    {verifiedLabel}
                    {unverifiedLabel}

                    <div className="pull-right">
                        {primaryAction}
                        {resendAction}
                        {removeAction}
                    </div>
                </div>
            );
        }

        return [
            <h3>E-mail Addresses</h3>,
            <p>The following e-mail addresses are associated with your account:</p>,

            <div className="form-horizontal col-sm-offset-1">
                {emailForms}
            </div>,

            <h3>Add E-mail Address</h3>,

            <div className="form-horizontal">
                <UI.Form>
                    <UI.FormGroup ref="emailFormGroup" label="Email">
                        <UI.EmailInput ref="emailFormInput" placeholder="john.smith@mail.com"/>
                    </UI.FormGroup>
                </UI.Form>
                <UI.AjaxButton ref="addEmailButton" className="col-sm-offset-2" onClick={() => {this.addEmail()}} level={UI.Level.PRIMARY}
                statusOptions={["Add Email", {faIcon: "spinner fa-spin", label:" Adding Email..."}, "Email added", "Failed"]}/>
            </div>,

            //<UI.CheckboxInput checked={this.options.user.} onClick={}/>
            <h5>
                Receive email notifications
                <UI.CheckboxInput ref="emailSubscriptionCheckbox" checked={true}
                                  onClick={() => {this.changeEmailSubscription(this.emailSubscriptionCheckbox.getValue())}}/>
            </h5>,
        ];
    }

    addEmail() {
        let email = this.emailFormInput.getValue();
        let request = {
            email: email,
        };

        this.emailFormGroup.removeError();

        console.log("adding email", request);

        this.addEmailButton.ajaxCall({
            url: "/accounts/email_address_add/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    this.emailFormGroup.setError(data.error);
                } else {
                    this.emailFormInput.setValue("");
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                    console.log("Email added", data);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while adding email:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    removeEmail(email) {
        let request = {
            email: email
        };

        if (!confirm("Are you sure you want to remove this email from your account?")) {
            return;
        }

        console.log("removing email", request);
        Ajax.request({
            url: "/accounts/email_address_remove/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                    console.log("Removed email", data);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while removing email:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    makePrimaryEmail(email) {
        let request = {
            email: email
        };

        console.log("Making email primary", request);
        Ajax.request({
            url: "/accounts/email_address_make_primary/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                    console.log("Email primarification successful", data);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while changing primary email:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    sendConfirmation(email) {
        let request = {
            email: email
        };

        console.log("sending confirmation", data);
        Ajax.request({
            url: "/accounts/email_address_verification_send/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (dataJSON) => {
                if (dataJSON.error) {
                    console.log(dataJSON.error);
                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                    console.log("Confirmation sent", dataJSON);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while sending email confirmation:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    changeEmailSubscription(receivesEmailAnnouncements) {
        let request = {
            receivesEmailAnnouncements: receivesEmailAnnouncements
        };

        Ajax.request({
            url: "/accounts/profile_changed/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    console.log("Successfully changed email subscription", data);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while removing email:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }
}


class SocialAccountsPanel extends UI.Panel {
    constructor(options) {
        super(options);
        // Ensure FacebookManager is initialized
        FacebookManager.Global();
        GoogleManager.Global();
    }

    render() {
        let addSocialAccountGroup = [
            <h3>Add a 3rd Party Account</h3>,
            <div className="form-horizontal col-sm-offset-1">
                <div className="form-group">
                    <a style={{cursor: "pointer"}} onClick={() => {
                        GoogleManager.Global().handleAuthClick(window.location.pathname, "connect", (data) => this.onSocialConnect(data));
                    }}>
                        <i className="fa fa-google fa-2x"/>
                        <span className="google-login-text"> Connect Google account</span>
                    </a>
                </div>
                <div className="form-group">
                    <a onClick={() => {FacebookManager.Global().login(window.location.pathname, "authenticate", "connect")}}>
                        <i className="fa fa-facebook fa-2x"/>
                        <span> Connect Facebook account</span>
                    </a>
                </div>
            </div>
        ];

        if (this.options.user.social.length) {
            let socialAccounts = [];
            for (let account of this.options.user.social) {
                socialAccounts.push(
                    <div className="form-group col-sm-12">
                        <label className="control-label">
                            <img src={account.picture} height="42" width="42"/>
                            <a href={account.link} target="_blank"> {account.name}</a>
                            <span> {"- " + account.platform}</span>
                        </label>
                        <div className="pull-right">
                            <UI.Button label="Remove" size={UI.Size.SMALL} level={UI.Level.DANGER} style={{"margin-top": "15px"}}
                                       onClick={() => {this.removeSocialAccount(account.id)}} />
                        </div>
                    </div>
                );
            }

            return [
                <h3>Social accounts</h3>,
                <p>You can sign in to your account using any of the following third party accounts:</p>,
                <div className="form-horizontal col-sm-offset-1">
                    {socialAccounts}
                </div>,
                ...addSocialAccountGroup
            ];
        } else {
            return [
                <h3>Social accounts</h3>,
                <p>You currently have no social network accounts connected to this account.</p>,
                ...addSocialAccountGroup
            ];
        }

    }

    onSocialConnect(data) {
        window.location.reload();
    }

    removeSocialAccount(socialAccountId) {
        let request = {
            socialAccountId: socialAccountId
        };
        Ajax.request({
            url: "/accounts/remove_social_account/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {

                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error while removing social account:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }
}


class UserSettingsPanel extends TabArea {
    setOptions(options) {
        super.setOptions(options);

        this.setUser(UserStore.getCurrentUser());

        this.options.children = [
            <GeneralInformationPanel title="General Info" active={true} user={this.user}/>,
            <EmailPanel title="Email" user={this.user}/>,
            <SocialAccountsPanel title="Social accounts" user={this.user}/>,
            <SecuritySettingsPanel ref={this.refLink("securitySettingsPanel")} title="Security" user={this.user} />,
        ];
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("height", "500px");
        attr.setStyle("width", "100%");
        return attr;
    }

    setUser(user) {
        this.user = user;
        console.log("Current user: ", this.user);
        this.user.addUpdateListener(() => {
            console.log("User updated!", this.user);
            for (let panel of this.options.children) {
                panel.redraw();
            }
        });
    }
}

export {UserSettingsPanel};
