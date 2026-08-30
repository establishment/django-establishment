import {UI, type ElementOptions} from "../../../stemjs/ui/UIBase";
import {TabArea} from "../../../stemjs/ui/tabs/TabArea";
import {FormField, Form} from "../../../stemjs/ui/form/Form";
import {TextInput} from "../../../stemjs/ui/input/Input";
import {PasswordInput} from "../../../stemjs/ui/input/Input";
import {EmailInput} from "../../../stemjs/ui/input/Input";
import {Label} from "../../../stemjs/ui/SimpleElements";
import {Select} from "../../../stemjs/ui/input/Input";
import {RawCheckboxInput} from "../../../stemjs/ui/input/Input";
import {Ajax} from "../../../stemjs/base/Ajax";
import {multikeySort} from "../../../stemjs/base/Utils";
import {Button} from "../../../stemjs/ui/button/Button";
import {AjaxButton} from "../../../stemjs/ui/button/AjaxButton";
import {GlobalStyle} from "../../../stemjs/ui/GlobalStyle";
import {Level, Size} from "../../../stemjs/ui/Constants";

import {User} from "../../../csaaccounts/js/state/UserStore";
import {FacebookManager} from "./thirt-party/FacebookManager";
import {GoogleManager} from "./thirt-party/GoogleManager";


export interface GeneralInformationPanelOptions {
    tabHref?: any;
    user?: User;
}

export interface SaveProfileRequest {
    firstName: string;
    lastName: string;
    userName: string;
    displayName: boolean;
    // A subclass adds its own fields, and the whole object is posted
    [key: string]: any;
}

export class GeneralInformationPanel extends UI.Element {
    declare options: ElementOptions<GeneralInformationPanelOptions>;
    declare displayNameSelect: Select<any>;
    declare firstNameFormField: FormField;
    declare firstNameFormInput: TextInput;
    declare lastNameFormField: FormField;
    declare lastNameFormInput: TextInput;
    declare saveProfileButton: AjaxButton;
    declare userNameFormField: FormField;
    declare userNameFormInput: TextInput;

    getFormFields() {
        return [
            <FormField ref="firstNameFormField" label="First Name">
                <TextInput ref="firstNameFormInput" placeholder="John" value={this.options.user.firstName}/>
            </FormField>,
            <FormField ref="lastNameFormField" label="Last Name">
                <TextInput ref="lastNameFormInput" placeholder="Smith" value={this.options.user.lastName}/>
            </FormField>,
            <FormField ref="userNameFormField" label="Username">
                <TextInput ref="userNameFormInput" placeholder="johnsmith" value={this.options.user.username || ""}/>
            </FormField>,
            <FormField ref="displayNameFormField" label="Display name">
                <Select ref="displayNameSelect" options={["Name", "Username"]}/>
            </FormField>
        ];
    }

    render() {
        return [
            <h3>{UI.T("General Info")}</h3>,
            <div>
                <Form>
                    {this.getFormFields()}
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

    getSaveRequestData(): SaveProfileRequest {
        let firstName = this.firstNameFormInput.getValue();
        let lastName = this.lastNameFormInput.getValue();
        let userName = this.userNameFormInput.getValue();
        let displayName = this.displayNameSelect.get();

        return {
            firstName: firstName,
            lastName: lastName,
            userName: userName,
            displayName: displayName === "Name"
        };
    }

    saveProfileChanges() {
        const request = this.getSaveRequestData();

        this.saveProfileButton.setIcon("");
        this.firstNameFormField.removeError();
        this.lastNameFormField.removeError();
        this.userNameFormField.removeError();
        this.saveProfileButton.postJSON("/accounts/profile_changed/", request).then(
            (data) => User.applyEvent({
                          objectId: data.user.id,
                          data: data.user,
                      }),
            (error) => {
                if (error.first_name) {
                    this.firstNameFormField.setError(error.first_name);
                }
                if (error.last_name) {
                    this.lastNameFormField.setError(error.last_name);
                }
                if (error.username) {
                    this.userNameFormField.setError(error.username);
                }
            }
        );
    }
}


export interface SecuritySettingsPanelOptions {
    tabHref?: any;
    user?: User;
}

export class SecuritySettingsPanel extends UI.Element {
    declare options: ElementOptions<SecuritySettingsPanelOptions>;
    declare newPasswordGroup: FormField;
    declare newPasswordGroup2: FormField;
    declare newPasswordInput: PasswordInput;
    declare newPasswordInput2: PasswordInput;
    declare oldPasswordGroup: FormField;
    declare oldPasswordInput: PasswordInput;
    declare setPasswordButton: AjaxButton;

    render() {
        return [
            <h3>{UI.T("Password")}</h3>,
            <div>
                <Form>
                    <FormField ref="oldPasswordGroup" label={UI.T("Current Password")}>
                        <PasswordInput ref="oldPasswordInput"/>
                    </FormField>
                    <FormField ref="newPasswordGroup" label={UI.T("New Password")}>
                        <PasswordInput ref="newPasswordInput" required/>
                    </FormField>
                    <FormField ref="newPasswordGroup2" label={[UI.T("New Password"), " (", UI.T("again"), ")"]}>
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

        this.setPasswordButton.postJSON("/accounts/password_change/", request).then(
            (data) => User.applyEvent({
                          objectId: data.user.id,
                          data: data.user,
                      }),
            (error) => this.oldPasswordGroup.setError(error.message)
        );
    }
}


export interface EmailPanelOptions {
    tabHref?: any;
    user?: User;
}

export class EmailPanel extends UI.Element {
    declare options: ElementOptions<EmailPanelOptions>;
    declare addEmailButton: AjaxButton;
    declare emailFormField: FormField;
    declare emailFormInput: EmailInput;
    declare emailSubscriptionCheckbox: RawCheckboxInput;

    render() {
        const emails = multikeySort(this.options.user.emails, email => [email.verified, email.primary], {desc: true});

        let emailForms = [];
        for (let email of emails) {
            let primaryLabel, verifiedLabel, unverifiedLabel;
            let primaryAction, removeAction, resendAction; // TODO: handle onclick
            let labelStyle = {borderRadius: "10px", marginLeft: "5px"};
            let actionStyle = {marginLeft: "7px"};

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
            <h3>{UI.T("E-mail Addresses")}</h3>,
            <p>{UI.T("The following e-mail addresses are associated with your account:")}</p>,

            emailForms,

            <h3>{UI.T("Add E-mail Address")}</h3>,

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
            <h5>
              <FormField label={UI.T("Receive email notifications")} inline={false}>
                <RawCheckboxInput ref="emailSubscriptionCheckbox" initialValue={this.options.user.receivesEmailAnnouncements}
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

        this.addEmailButton.postJSON("/accounts/email_address_add/", request).then(
            (data) => {
                this.emailFormInput.setValue("");
                User.applyEvent({
                    objectId: data.user.id,
                    data: data.user,
                });
            },
            (error) => this.emailFormField.setError(error.message)
        );
    }

    removeEmail(email) {
        let request = {
            email: email
        };

        if (!confirm("Are you sure you want to remove this email from your account?")) {
            return;
        }

        Ajax.postJSON("/accounts/email_address_remove/", request).then(
            (data) => User.applyEvent({
                          objectId: data.user.id,
                          data: data.user,
                      })
        );
    }

    makePrimaryEmail(email) {
        let request = {
            email: email
        };

        Ajax.postJSON("/accounts/email_address_make_primary/", request).then(
            (data) => User.applyEvent({
                          objectId: data.user.id,
                          data: data.user,
                      })
        );
    }

    sendConfirmation(email) {
        Ajax.postJSON("/accounts/email_address_verification_send/", {
            email: email
        });
    }

    changeEmailSubscription(receivesEmailAnnouncements) {
        Ajax.postJSON("/accounts/profile_changed/", {
            receivesEmailAnnouncements: receivesEmailAnnouncements
        });
    }
}


export interface SocialAccountsPanelOptions {
    tabHref?: any;
    user?: User;
}

export class SocialAccountsPanel extends UI.Element {
    declare options: ElementOptions<SocialAccountsPanelOptions>;

    constructor(options) {
        super(options);
        // Ensure Social managers are initialized
        // TODO: should use the Social App store!
        FacebookManager.getInstance();
        GoogleManager.getInstance();
    }

    render() {
        let addSocialAccountGroup = [
            <h3>{UI.T("Add a 3rd Party Account")}</h3>,
            <div>
              <a style={{cursor: "pointer"}} onClick={() => GoogleManager.connect()}>
                <i className="fa fa-google fa-2x"/>
                <span className="google-login-text"> {UI.T("Connect Google account")}</span>
              </a>
            </div>,
            <div>
              <a onClick={() => {FacebookManager.connect()}}>
                <i className="fa fa-facebook fa-2x"/>
                <span> {UI.T("Connect Facebook account")} </span>
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
                            <Button label="Remove" size={Size.SMALL} level={Level.DANGER} style={{marginTop: "7px"}}
                                       onClick={() => {this.removeSocialAccount(account.id)}} />
                        </div>
                    </div>
                );
            }

            return [
                <h3>{UI.T("Social accounts")}</h3>,
                <p>{UI.T("You can sign in to your account using any of the following third party accounts:")}</p>,
                <div>
                    {socialAccounts}
                </div>,
                ...addSocialAccountGroup
            ];
        } else {
            return [
                <h3>{UI.T("Social accounts")}</h3>,
                <p>{UI.T("You currently have no social network accounts connected to this account.")}</p>,
                ...addSocialAccountGroup
            ];
        }

    }

    removeSocialAccount(socialAccountId) {
        Ajax.postJSON("/accounts/remove_social_account/", {
            socialAccountId: socialAccountId
        }).then(
            (data) => User.applyEvent({
                          objectId: data.user.id,
                          data: data.user,
                      })
        );
    }
}


export class UserSettingsPanel extends UI.Element {
    declare initialUrlParts: any;
    declare tabArea: TabArea;

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setStyle({
            height: "500px"
        });
        attr.addClass(GlobalStyle.Container.SMALL);
    }

    getUrlPrefix(str) {
        let url = "/accounts/settings/";
        if (str) {
            url += str + "/";
        }
        return url;
    }

    setURL(urlParts) {
        if (this.tabArea) {
            this.showUrlTab(urlParts[0] || "general");
        } else {
            this.initialUrlParts = urlParts;
        }
    }

    showUrlTab(tabName) {
        if (this[tabName + "UI.Element"]) {
            this[tabName + "UI.Element"].dispatch("show");
        } else {
            this["generalPanel"].dispatch("show");
        }
    }

    getUser() {
        return User.getCurrentUser();
    }

    getPanels() {
        return [
            <GeneralInformationPanel title={UI.T("General Info")} active={true}
                                     user={this.getUser()} ref="generalPanel" tabHref={this.getUrlPrefix("general")} />,
            <EmailPanel title={UI.T("Email")} user={this.getUser()}
                        ref="emailPanel" tabHref={this.getUrlPrefix("email")} />,
            <SocialAccountsPanel title={UI.T("Social accounts")} user={this.getUser()}
                        ref="socialPanel" tabHref={this.getUrlPrefix("social")} />,
            <SecuritySettingsPanel title={UI.T("Security")}
                                   user={this.getUser()} ref="securityPanel" tabHref={this.getUrlPrefix("security")} />
        ];
    }

    render() {
        return [
            <TabArea ref="tabArea">
                {this.getPanels()}
            </TabArea>
        ];
    }

    onMount() {
        this.setURL(this.initialUrlParts);
        delete this.initialUrlParts;
    }
}

