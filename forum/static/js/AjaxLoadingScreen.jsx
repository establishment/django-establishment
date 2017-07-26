import {UI} from "UI";
import {css, hover, focus, active, ExclusiveClassSet, StyleSet} from "Style";


class AjaxLoadingScreen extends UI.Element {
    static init() {
        // Init
        let style = this.prototype.css = new StyleSet({
            updateOnResize: true,
        });

        // Constants and resize parameters
        let navbarHeight = 60;
        let windowInnerWidth;
        let windowInnerHeight;

        style.addBeforeUpdateListener(() => {
            windowInnerWidth = window.innerWidth;
            windowInnerHeight = window.innerHeight;
        });
        style.update();

        // Actual styling
        style.createCircle = ((size, borderSize, color, animationName, animationDuration) => {
            return {
                "position": "absolute",

                "margin-left": () => (windowInnerWidth - size) / 2 + "px",
                "margin-top": () => (windowInnerHeight - size) / 2 - navbarHeight + "px",
                "height": size + "px",
                "width": size + "px",

                "border": borderSize + "px solid " + color,
                "border-radius": size + "px",
                "border-right": borderSize + "px solid #fff",
                "border-bottom": borderSize + "px solid #fff",

                "rotate": "0deg",
                "transform": "rotate(45deg)",
                "-webkit-transform": "rotate(45deg)",

                "animation-name": animationName,
                "animation-duration": animationDuration,
                "animation-iteration-count": "infinite",
                "animation-timing-function": "linear",
            };
        });
    }

    createCircle(size, borderSize, color, animationName, animationDuration) {
        return <div style={this.css.createCircle(size, borderSize, color, animationName, animationDuration)} />;
    }

    render() {
        let centerConstant = 100;
        return [
            this.createCircle(225 - centerConstant, 5, "#999967", "loading-screen-rotate-clockwise", "2.25s"),
            this.createCircle(200 - centerConstant, 4, "#666666", "loading-screen-rotate-reverse-clockwise", "1.5s"),
            this.createCircle(175 - centerConstant, 3, "#cccccc", "loading-screen-rotate-clockwise", "1s"),
            this.createCircle(150 - centerConstant, 2, "#cccc9a", "loading-screen-rotate-reverse-clockwise", "4.5s"),
        ];
    }
}


export {AjaxLoadingScreen}
