import {UI, SVG} from "UI";
import * as math from "math";
import {Transition} from "Transition";

class PieChartSector extends SVG.Group {
    getDefaultOptions() {
        return {
            opacity: 0.65,
            hoverTime: 250
        }
    }

    getArcPoint(angle, radius, orientation) {
        let spacing = this.options.spacing;
        let center = this.options.center;

        let line = math.lineEquation(center, math.polarToCartesian(angle, radius, center));

        // TODO: This binary search can be replaced by O(1) formula
        let left = 0, right = Math.PI / 2;
        for (let step = 0; step < 20; ++step) {
            let mid = (left + right) / 2;
            let dist = math.distancePointLine(math.polarToCartesian(angle + (orientation === 1 ? 1 : -1) * mid, radius, center), line);
            if (dist > spacing / 2) {
                right = mid;
            } else {
                left = mid;
            }
        }
        return math.polarToCartesian(angle + (orientation === 1 ? 1 : -1) * left, radius, center);
    }

    getPath(outerExtra=0, innerExtra=-1) {
        if (innerExtra === -1) {
            innerExtra = outerExtra / 2;
        }

        let startAngle = this.options.startAngle;
        let angleSpan = this.options.angleSpan;

        let innerRadius = this.options.innerRadius + innerExtra;
        let outerRadius = this.options.outerRadius + outerExtra;

        let innerStartPoint = this.getArcPoint(startAngle, innerRadius, 1);
        let innerEndPoint = this.getArcPoint(startAngle + angleSpan, innerRadius, -1);
        let outerStartPoint = this.getArcPoint(startAngle, outerRadius, 1);
        let outerEndPoint = this.getArcPoint(startAngle + angleSpan, outerRadius, -1);

        let largeArcFlag = angleSpan <= Math.PI ? 0 : 1;

        return "M " + innerStartPoint.x + " " + innerStartPoint.y + " " +
            "A " + innerRadius + " " + innerRadius + " 0 " + largeArcFlag + " 1 " + innerEndPoint.x + " " + innerEndPoint.y +
            "L " + outerEndPoint.x + " " + outerEndPoint.y + " " +
            "A " + outerRadius + " " + outerRadius + " 0 " + largeArcFlag + " 0 "+ outerStartPoint.x + " " + outerStartPoint.y + "Z";
    }

    getMiddlePoint(outerExtra=0, innerExtra=-1) {
        if (innerExtra === -1) {
            innerExtra = outerExtra / 2;
        }

        let startAngle = this.options.startAngle;
        let angleSpan = this.options.angleSpan;

        let innerRadius = this.options.innerRadius + innerExtra;
        let outerRadius = this.options.outerRadius + outerExtra;

        return this.getArcPoint(startAngle + angleSpan / 2, (innerRadius + outerRadius) / 2, -1);
    }

    changeRadiusTransition(extra, duration) {
        return new Transition({
            func: (t) => {
                this.path.setPath(this.getPath(t * extra));
                let middlePoint = this.getMiddlePoint(t * extra);
                this.label.setPosition(middlePoint.x, middlePoint.y);
            },
            duration: duration,
        });
    }

    render() {
        return [
            <SVG.Path ref="path" d={this.getPath()} fill={this.options.pathFill}/>,
            <SVG.Text ref="label"
                         text={(this.options.percent * 100).toFixed(1) + "%"}
                         {...this.getMiddlePoint()}
                         color="white"
                         fill="white"
            />,
        ];
    }

    onMount() {
        this.addNodeListener("mouseenter", () => {
            this.changeOpacityTransition(1, this.options.hoverTime).start();
            this.changeRadiusTransition(this.options.hoverExpandRadius, this.options.hoverTime).start();
        });
        this.addNodeListener("mouseout", () => {
            this.changeOpacityTransition(0.65, this.options.hoverTime).start();
            this.changeRadiusTransition(0, this.options.hoverTime).start();
        });
    }
}

export class PieChart extends SVG.Group {
    getDefaultOptions() {
        return {
            innerRadius: 40,
            outerRadius: 60,
            hoverExpandRadius: 10,
            startAngle: Math.PI * 3 / 2,
            spacing: 2
        }
    }

    render() {
        let pieChartSectors = [];

        let totalSize = 0;
        for (let sector of this.options.sectors) {
            totalSize += sector.size;
        }

        let currentAngle = this.options.startAngle;
        for (let sector of this.options.sectors) {
            let angleSpan = (2 * Math.PI) * sector.size / totalSize;

            pieChartSectors.push(<PieChartSector
                startAngle={currentAngle}
                angleSpan={angleSpan}
                innerRadius={this.options.innerRadius}
                outerRadius={this.options.outerRadius}
                hoverExpandRadius={this.options.hoverExpandRadius}
                center={this.options.center}
                spacing={this.options.spacing}
                pathFill={sector.color}
                percent={sector.size / totalSize}
            />);

            currentAngle += angleSpan;
        }
        return pieChartSectors;
    }
}

export class PieChartSVG extends SVG.SVGRoot {
    getDefaultOptions() {
        return {
            width: 240,
            height: 240,
            innerRadius: 50,
            outerRadius: 100,
            hoverExpandRadius: 20,
        }
    }

    extraNodeAttributes(attr) {
        attr.setStyle("height", this.options.height + "px");
        attr.setStyle("width", this.options.width + "px");
    }

    render() {
        return [
            <PieChart center={{x: this.options.width / 2, y: this.options.height / 2}}
                      innerRadius={this.options.innerRadius}
                      outerRadius={this.options.outerRadius}
                      hoverExpectedRadius={this.options.hoverExpandRadius}
                      sectors={this.options.sectors}
            />
        ];
    }
}
