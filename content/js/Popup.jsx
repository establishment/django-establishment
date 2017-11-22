import {UI, FloatingWindow, Direction, Panel, Button} from "UI";
import {Device} from "Device";

export class BasePopup extends FloatingWindow {
    static bodyPopups = new Set();

    getDefaultOptions() {
        let options = super.getDefaultOptions();
        options.x = 0;
        options.y = 0;
        options.contentPadding = "7px";
        options.contentStyle = {};
        options.arrowDirection = Direction.UP;
        options.arrowColor = "white";
        options.backgroundColor = "white";
        return options;
    }

    setOptions(options) {
        super.setOptions(options);
        this.options.style = Object.assign({
            boxShadow: "0px 0px 4px rgba(0,0,0,0.5)",
            borderRadius: "5px",
            display: "table",
            maxWidth: "350px",
            backgroundColor: this.options.backgroundColor,
            position: "absolute",
            left: (this.options.x) + "px",
            top: (this.options.y) + "px",
            zIndex: "3",
            right: "0px"
        }, this.options.style);
        this.createArrowStyle();
    }

    setContent(content) {
        this.options.children = content;
        this.redraw();
    }

    getContent() {
        return <div style={Object.assign({padding: this.options.contentPadding}, this.options.contentStyle)} ref="contentArea">
                {this.options.children}
            </div>;
    }

    createArrowStyle() {
        let baseArrowOutline = {
            "left": "50%",
            "z-index": "-3",
            "position": "absolute",
            "width": "0",
            "height": "0",
            "border-left": "10px solid transparent",
            "border-right": "10px solid transparent",
            marginLeft: "-11px"
        };

        this["arrow" + Direction.UP + "Outline"] = Object.assign({
            "border-bottom": "10px solid #C8C8C8",
            "margin-top": "-10.8px",
            marginLeft: "-11px"
        }, baseArrowOutline);

        this["arrow" + Direction.DOWN + "Outline"] = Object.assign({
            "border-top": "10px solid #C8C8C8",
            "margin-top": "2px"
        }, baseArrowOutline);

        let baseArrow = {
            "left": "50%",
            "position": "absolute",
            "width": "0",
            "height": "0",
            "border-left": "10px solid transparent",
            "border-right": "10px solid transparent",
        };

        this["arrow" + Direction.UP] = Object.assign({
            "margin-top": "-10px",
            "border-bottom": "10px solid " + this.options.arrowColor
        }, baseArrow);

        this["arrow" + Direction.DOWN] = Object.assign({
            "border-top": "10px solid " + this.options.arrowColor
        }, baseArrow);
    }

    getArrow() {
        let direction = this.options.arrowDirection;
        return [
            <Panel ref="popupArrow" style={this["arrow" + direction]}/>,
            <Panel ref="popupArrowOutline" style={this["arrow" + direction + "Outline"]} />
        ];
    }

    render() {
        return (this.options.arrowDirection === Direction.UP) ?
            [this.getArrow(), this.getContent()] :
            [this.getContent(), this.getArrow()];
    }

    bindInsideParent() {
        if (this.target) {
            this.options.x = this.target.offsetWidth / 2;
            this.options.y = (this.options.arrowDirection === Direction.UP ? this.target.offsetHeight : 0);
        }
        let left = parseFloat(this.options.x);
        let top = parseFloat(this.options.y) + (this.options.arrowDirection === Direction.UP ? 11 : - this.getHeight() - 11);
        let arrowMargin = -11;
        left -= this.getWidth() / 2;
        if (this.options.bodyPlaced && this.target) {
            const rect = this.target.getBoundingClientRect();
            left += rect.left;
            top += rect.top;
        }
        if (this.target && !this.options.bodyPlaced) {
            if (this.node.offsetParent && !this.options.bodyPlaced) {
                let left2 = left + this.node.offsetParent.offsetLeft;
                if (left2 < 0) {
                    left -= left2 - 2;
                    arrowMargin += left2 + 2;
                } else if (left2 + this.getWidth() > this.node.offsetParent.offsetParent.offsetWidth) {
                    let delta = this.node.offsetParent.offsetParent.offsetWidth - (left2 + this.getWidth());
                    arrowMargin -= delta - 2;
                    left += delta - 2;
                }
            }
        } else {
            if (left < 0) {
                arrowMargin += left + 2;
                left = 2;
            } else if (left + this.getWidth() > this.parentNode.offsetWidth) {
                let delta = left + this.getWidth() - this.parentNode.offsetWidth;
                arrowMargin += delta;
                left -= delta;
            }
        }
        this.popupArrow.setStyle("margin-left", arrowMargin + "px");
        this.popupArrowOutline.setStyle("margin-left", arrowMargin + "px");

        this.setStyle("left", left + "px");
        this.setStyle("top", top + "px");
    }

    setParent(parent) {
        let newParent;
        if (parent instanceof HTMLElement) {
            newParent = parent;
        } else {
            newParent = parent.node;
        }
        if (newParent === this.parentNode) {
            return;
        }
        if (this.isInDocument()) {
            this.parentNode.removeChild(this.node);
            newParent.appendChild(this.node);
            this.setParentNode(newParent);
        } else {
            this.setParentNode(newParent);
        }
    }

    setCenter(center, manual=false) {
        this.options.x = center.x;
        this.options.y = center.y;
        if (manual) {
            setTimeout(() => {
                this.bindInsideParent();
            }, 0);
        } else {
            this.bindInsideParent();
        }
    }

    static clearBodyPopups() {
        for (const popup of this.bodyPopups) {
            popup.hide();
        }
        this.bodyPopups.clear();
    }

    onUnmount() {
        super.onUnmount();
        if (this.options.bodyPlaced && this.target) {
            this.constructor.bodyPopups.delete(this);
        }
    }

    onMount() {
        if(this.options.target) {
            if (this.options.target instanceof HTMLElement) {
                this.target = this.options.target;
            } else {
                this.target = this.options.target.node;
            }
            this.options.x = this.target.offsetWidth / 2;
            this.options.y = this.target.offsetHeight;
        }
        super.onMount();
        // Set the Popup inside the parent
        this.bindInsideParent();
        if (this.options.bodyPlaced && this.target) {
            this.constructor.bodyPopups.add(this);
        }
    }
}

export class Popup extends BasePopup {
    getDefaultOptions() {
        let options = super.getDefaultOptions();
        options.titleFontSize = "12pt";
        options.contentFontSize = "10pt";
        options.arrowColor = "#F3F3F3";
        return options;
    }

    getContent() {
        let contentArea = super.getContent();
        contentArea.options.style = Object.assign({
            fontSize: this.options.contentFontSize
        }, contentArea.options.style || {});

        return [<Panel ref="titleArea" style={{backgroundColor: "#F3F3F3", paddingLeft: "20px", fontSize: this.options.titleFontSize,
                fontWeight:"bold", paddingTop: "6px", paddingBottom: "6px", textAlign: "center",
                borderBottom: "1px solid #BEBEBE"}}>
                {this.getTitleAreaContent()}
            </Panel>,
            contentArea,
        ];
    }

    setTitle(newTitle) {
        this.options.title = newTitle;
        this.redraw();
    }

    getTitleAreaContent() {
        return [<Button className="pull-right" ref="closeButton" style={{backgroundColor:"transparent",border: "none", color: "#888888", fontSize:"18pt", padding:"2px", marginRight:"3px", marginTop:"-12px"}} label="×"/>,
            <div style={{marginRight: "25px"}}>{this.options.title}</div>
        ];
    }

    bindWindowListeners() {
        this.addClickListener((event) => {
            event.stopPropagation();
        });

        let documentListener = () => {
            this.hide();
            if (!Device.supportsEvent("click")) {
                document.removeEventListener("touchstart", documentListener);
            } else {
                document.removeEventListener("click", documentListener);
            }
        };
        if (!Device.supportsEvent("click")) {
            document.addEventListener("touchstart", documentListener);
        } else {
            document.addEventListener("click", documentListener);
        }

    }

    show() {
        super.show();
        this.bindWindowListeners();
    }

    redraw() {
        if (this.isInDocument()) {
            this.bindInsideParent();
        }
        super.redraw();
    }

    onMount() {
        super.onMount();

        // fake a click event that will propagate to window and trigger
        // the events of any other popup, closing them
        let fakeClickEvent = document.createEvent("MouseEvents");
        fakeClickEvent.initEvent("click", true, false);
        document.body.dispatchEvent(fakeClickEvent);

        // Make the popup close when something else is clicked
        this.bindWindowListeners();

        // Close button behavior
        this.closeButton.addClickListener(() => {
            this.hide();
            this.closeButton.node.blur();
        });
        let closeButtonColor = this.closeButton.options.style.color;
        this.closeButton.addNodeListener("mouseover", () => {
            this.closeButton.setStyle("color", "#0082AD");
        });
        this.closeButton.addNodeListener("mouseout", () => {
            this.closeButton.setStyle("color", closeButtonColor);
        });
    }
}
