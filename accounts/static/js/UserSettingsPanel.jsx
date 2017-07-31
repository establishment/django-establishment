import {
    UI, TabArea, Form, FormField, TextInput,
    AjaxButton, PasswordInput, EmailInput, Panel,
    Label, Button, Select, CheckboxInput
} from "UI";
import {UserStore} from "UserStore";
import {FacebookManager} from "FacebookManager";
import {GoogleManager} from "GoogleManager";
import {Ajax} from "Ajax";
import {Level, Size} from "Constants";

class GeneralInformationPanel extends Panel {
    render() {
        return [
            <h3>General Info</h3>,
            <div>
                <Form>
                    <FormField ref="firstNameFormField" label="First Name">
                        <TextInput ref="firstNameFormInput" placeholder="John" value={this.options.user.firstName}/>
                    </FormField>
                    <FormField ref="lastNameFormField" label="Last Name">
                        <TextInput ref="lastNameFormInput" placeholder="Smith" value={this.options.user.lastName}/>
                    </FormField>
                    <FormField ref="userNameFormField" label="Username">
                        <TextInput ref="userNameFormInput" placeholder="johnsmith" value={this.options.user.username || ""}/>
                    </FormField>
                    <FormField ref="displayNameFormField" label="Display name">
                        <Select ref="displayNameSelect" options={["Name", "Username"]}/>
                    </FormField>
                </Form>
                <FormField label=" ">
                  <div><AjaxButton ref="saveProfileButton" level={Level.PRIMARY}
                                   statusOptions={["Save changes", {faIcon: "spinner fa-spin", label:" Saving changes..."}, "Saved changes", "Save failed"]}/></div>
                </FormField>
            </div>
        ];
    }

    onMount() {
        super.onMount();

        this.displayNameSelect.set(this.options.user.displayName ? "Name" : "Username");

        this.saveProfileButton.addClickListener(() => {
            this.saveProfileChanges();
        });
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

                this.firstNameFormField.removeError();
                this.lastNameFormField.removeError();
                this.userNameFormField.removeError();

                if (data.error) {
                    console.log(data.error);
                    if (data.error.first_name) {
                        this.firstNameFormField.setError(data.error.first_name);
                    }
                    if (data.error.last_name) {
                        this.lastNameFormField.setError(data.error.last_name);
                    }
                    if (data.error.username) {
                        this.userNameFormField.setError(data.error.username);
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


class SecuritySettingsPanel extends Panel {
    render() {
        return [
            <h3>Password</h3>,
            <div>
                <Form>
                    <FormField ref="oldPasswordGroup" label="Current Password">
                        <PasswordInput ref="oldPasswordInput"/>
                    </FormField>
                    <FormField ref="newPasswordGroup" label="New Password">
                        <PasswordInput ref="newPasswordInput" required/>
                    </FormField>
                    <FormField ref="newPasswordGroup2" label="New Password (again)">
                        <PasswordInput ref="newPasswordInput2" required/>
                    </FormField>
                </Form>
                <FormField label=" ">
                      <div><AjaxButton ref="setPasswordButton" level={Level.PRIMARY}
                        statusOptions={["Set Password", {faIcon: "spinner fa-spin", label:" Setting Password..."}, "Password set", "Failed"]}/></div>
                </FormField>
            </div>
        ];
    }

    onMount() {
        super.onMount();

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


class EmailPanel extends Panel {
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
            let actionStyle = {"margin-left": "7px"};

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
                    primaryLabel = <Label level={Level.PRIMARY} style={labelStyle} label="Primary"/>;
                } else {
                    verifiedLabel = <Label level={Level.SUCCESS} style={labelStyle} label="Verified"/>;
                    primaryAction = <Button onClick={makePrimaryCallback} size={Size.EXTRA_SMALL} level={Level.PRIMARY} label="Make Primary"
                                               style={actionStyle} />;
                }
            } else {
                unverifiedLabel = <Label level={Level.DANGER} style={labelStyle} label="Unverified"/>;
                resendAction = <Button onClick={resendCallback} size={Size.EXTRA_SMALL} label="Re-send confirmation"
                                          style={actionStyle} />;
            }

            if (!email.primary) {
                removeAction = <Button onClick={removeCallback} size={Size.EXTRA_SMALL} level={Level.DANGER} label="Remove"
                                          style={actionStyle} />;
            }

                emailForms.push(
                    <div style={{width: "100%", position: "relative", paddingTop: "4px", paddingBottom: "4px"}}>
                    <strong>{email.email}</strong>
                    {primaryLabel}
                    {verifiedLabel}
                    {unverifiedLabel}

                    <div style={{right: "0", top: "0", position: "absolute"}}>
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

            emailForms,

            <h3>Add E-mail Address</h3>,

            <div>
                <Form>
                    <FormField ref="emailFormField" label="Email">
                        <EmailInput ref="emailFormInput" placeholder="john.smith@mail.com"/>
                    </FormField>
                    <FormField label=" ">
                      <div><AjaxButton ref="addEmailButton" onClick={() => {this.addEmail()}} level={Level.PRIMARY}
                        statusOptions={["Add Email", {faIcon: "spinner fa-spin", label:" Adding Email..."}, "Email added", "Failed"]}/></div>
                    </FormField>
                </Form>
            </div>,

            //<UI.CheckboxInput checked={this.options.user.} onClick={}/>
            <h5>
              <FormField label="Receive email notifications" inline={false}>
                <CheckboxInput ref="emailSubscriptionCheckbox" checked={true}
                                  onClick={() => {this.changeEmailSubscription(this.emailSubscriptionCheckbox.getValue())}}/>
              </FormField>
            </h5>,
        ];
    }

    addEmail() {
        let email = this.emailFormInput.getValue();
        let request = {
            email: email,
        };

        this.emailFormField.removeError();

        console.log("adding email", request);

        this.addEmailButton.ajaxCall({
            url: "/accounts/email_address_add/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    this.emailFormField.setError(data.error);
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
        Ajax.postJSON("/accounts/email_address_remove/", request).then(
            (data) => {
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
            (error) => {
                console.log("Error while removing email:\n" + error.message);
                console.log(error.stack);
            }
        );
    }

    makePrimaryEmail(email) {
        let request = {
            email: email
        };

        console.log("Making email primary", request);
        Ajax.postJSON("/accounts/email_address_make_primary/", request).then(
            (data) => {
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
            (error) => {
                console.log("Error while changing primary email:\n" + error.message);
                console.log(error.stack);
            }
        );
    }

    sendConfirmation(email) {
        let request = {
            email: email
        };

        console.log("sending confirmation", data);
        Ajax.postJSON("/accounts/email_address_verification_send/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    console.log("Confirmation sent", data);
                }
            },
            (error) => {
                console.log("Error while sending email confirmation:\n" + error.message);
                console.log(error.stack);
            }
        );
    }

    changeEmailSubscription(receivesEmailAnnouncements) {
        let request = {
            receivesEmailAnnouncements: receivesEmailAnnouncements
        };

        Ajax.postJSON("/accounts/profile_changed/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    console.log("Successfully changed email subscription", data);
                }
            },
            (error) => {
                console.log("Error while removing email:\n" + error.message);
                console.log(error.stack);
            }
        );
    }
}


class SocialAccountsPanel extends Panel {
    constructor(options) {
        super(options);
        // Ensure FacebookManager is initialized
        FacebookManager.Global();
        GoogleManager.Global();
    }

    render() {
        let addSocialAccountGroup = [
            <h3>Add a 3rd Party Account</h3>,
            <div>
              <a style={{cursor: "pointer"}} onClick={() => {
                    GoogleManager.Global().handleAuthClick(window.location.pathname, "connect", (data) => this.onSocialConnect(data));
                }}>
                <i className="fa fa-google fa-2x"/>
                <span className="google-login-text"> Connect Google account</span>
              </a>
            </div>,
            <div>
              <a onClick={() => {FacebookManager.Global().login(window.location.pathname, "authenticate", "connect")}}>
                <i className="fa fa-facebook fa-2x"/>
                <span> Connect Facebook account</span>
              </a>
            </div>
        ];

        if (this.options.user.social.length) {
            let socialAccounts = [];
            for (let account of this.options.user.social) {
                socialAccounts.push(
                    <div>
                        <label>
                            <img src={account.picture} height="42" width="42"/>
                            <a href={account.link} target="_blank"> {account.name}</a>
                            <span> {"- " + account.platform}</span>
                        </label>
                        <div className="pull-right">
                            <Button label="Remove" size={Size.SMALL} level={Level.DANGER} style={{"margin-top": "7px"}}
                                       onClick={() => {this.removeSocialAccount(account.id)}} />
                        </div>
                    </div>
                );
            }

            return [
                <h3>Social accounts</h3>,
                <p>You can sign in to your account using any of the following third party accounts:</p>,
                <div>
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
        Ajax.postJSON("/accounts/remove_social_account/", request).then(
            (data) => {
                if (data.error) {

                } else {
                    UserStore.applyEvent({
                        objectId: data.user.id,
                        data: data.user,
                    });
                }
            },
            (error) => {
                console.log("Error while removing social account:\n" + error.message);
                console.log(error.stack);
            }
        );
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
            <SecuritySettingsPanel ref={this.refLink("securitySettingsPanel")} title="Security" user={this.user} />
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
