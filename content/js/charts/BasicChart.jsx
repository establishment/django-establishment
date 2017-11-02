// TODO: write own custom Scale
import {UI, SVG, Direction} from "UI";
import {StemDate} from "Time";
import {uniqueId} from "Utils";
import {event, zoom, scaleLinear, scaleTime, select} from "d3";
import * as d3 from "d3";

import {LinePlot} from "./LinePlot";
import {BasePointPlot} from "./PointPlot";

// TODO: This file desperately needs a refactoring.

export class AxisTick extends SVG.Group {
    getDefaultOptions() {
        return {
            gridLineLength: 0,
            axisLineLength: 6,
            gridLineStroke: "rgba(255, 255, 255, .7)",
            labelPadding: 6,
            labelStrokeWidth: 0.5,
            labelFontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
        };
    }

    getLabel() {
        let labelOptions = {
            text: "" + this.options.label,
            strokeWidth: this.options.labelStrokeWidth
        };
        if (this.options.orientation === Direction.DOWN) {
            Object.assign(labelOptions, {
                textAnchor: "middle",
                dy: ".71em",
                y: this.options.labelPadding + this.options.axisLineLength
            });
        } else if (this.options.orientation === Direction.LEFT) {
            Object.assign(labelOptions, {
                textAnchor: "end",
                dy: ".35em",
                x: -1 * (this.options.labelPadding + this.options.axisLineLength)
            });
        }
        return <SVG.Text ref={this.refLink("label")} {...labelOptions}/>;
    }

    getGridLine() {
        let gridLineOptions = {
            fill: this.options.gridLineStroke,
            stroke: this.options.gridLineStroke
        };
        if (this.axisPosition === this.options.scale.range()[0]) {
            return;
        }
        if (this.options.orientation === Direction.DOWN) {
            Object.assign(gridLineOptions, {
                y2: -1 * this.options.chartOptions.height
            });
        } else if (this.options.orientation === Direction.LEFT) {
            Object.assign(gridLineOptions, {
                x2: this.options.chartOptions.width
            });
        }
        return <SVG.Line ref={this.refLink("gridLine")} {...gridLineOptions}/>;
    }

    getAxisLine() {
        let axisLineOptions = {};
        if (this.options.orientation === Direction.DOWN) {
            Object.assign(axisLineOptions, {
                y2: this.options.axisLineLength
            });
        } else if (this.options.orientation === Direction.LEFT) {
            Object.assign(axisLineOptions, {
                x2: -1 * this.options.axisLineLength
            });
        }
        return <SVG.Line ref={this.refLink("axisLine")} {...axisLineOptions}/>
    }

    render() {
        this.axisPosition = this.options.scale(this.options.value);

        if (this.options.orientation === Direction.DOWN) {
            this.translate(this.axisPosition, 0);
        } else if (this.options.orientation === Direction.LEFT) {
            this.translate(0, this.axisPosition);
        }

        return [this.getGridLine(), this.getAxisLine(), this.getLabel()];
    }

    showGridLine() {
        if (this.axisPosition === this.options.scale.range()[0]) {
            this.gridLine.hide();
        } else {
            this.gridLine.show();
        }
    }

    hideGridLine() {
        this.gridLine.hide();
    }
}

export class BasicAxis extends SVG.Group {
    getDefaultOptions() {
        return {
            labelFormatFunction: (x) => {return x;}
        };
    }

    getAxisLine() {
        let axisLineOptions = {};
        if (this.options.orientation === Direction.DOWN) {
            Object.assign(axisLineOptions, {
                x2: this.options.chartOptions.width
            });
            this.axisLength = this.options.chartOptions.width;
        } else if (this.options.orientation === Direction.LEFT) {
            Object.assign(axisLineOptions, {
                y2: this.options.chartOptions.height
            });
            this.axisLength = this.options.chartOptions.height;
        }
        return <SVG.Line ref={this.refLink("axisLine")} {...axisLineOptions}/>;
    }

    getTicks() {
        this.ticks = [];
        this.tickValues = this.options.scale.ticks(this.options.ticks);
        for (let i = 0; i < this.tickValues.length; i += 1) {
            let tickValue = this.tickValues[i];
            this.ticks[i] = <AxisTick ref={this.refLinkArray("ticks", i)} chartOptions={this.options.chartOptions}
                                             scale={this.options.scale} orientation={this.options.orientation}
                                             value={tickValue} label={this.options.labelFormatFunction(tickValue)}/>;
        }
        return this.ticks;
    }

    render() {
        if (this.options.orientation === Direction.DOWN) {
            this.translate(0, this.options.chartOptions.height);
        }

        return [...this.getTicks(), this.getAxisLine()];
    }

    showGridLines() {
        for (let tick of this.ticks) {
            tick.showGridLine();
        }
    }

    hideGridLines() {
        for (let tick of this.ticks) {
            tick.hideGridLine();
        }
    }
}

export class BasicChart extends SVG.Group {
    getDefaultOptions() {
        return {
            enableZoom: true,
            margin: {
                top: 20,
                bottom: 30,
                left: 50,
                right: 20
            },
            domainPadding: [0],
            xAxisDomain: [0, 160],
            yAxisDomain: [0, 100],
            xAxisScaleType: "linear",
            yAxisScaleType: "linear",
            cursorStyle: "move"
        };
    }

    normalizePadding(padding) {
        if (!Array.isArray(padding)) {
            return null;
        }

        if (padding.length === 1) {
            return [padding[0], padding[0], padding[0], padding[0]];
        } else if (padding.length === 2) {
            return [padding[0], padding[1], padding[0], padding[1]];
        } else if (padding.length === 3) {
            return [padding[0], padding[1], padding[2], padding[1]];
        } else if (padding.length === 4) {
            return padding;
        } else {
            error("BasicChart.normalizePadding receives invalid padding array: ", padding);
            return null;
        }
    }

    getPaddedDomain(domain, padding) {
        let domainLength = domain[1] - domain[0];
        return [domain[0] - padding[0] * domainLength, domain[1] + padding[1] * domainLength];
    }

    getScaleType(type) {
        if (type === "linear") {
            return scaleLinear();
        } else if (type === "time") {
            return scaleTime();
        }
    }

    setOptions(options) {
        super.setOptions(options);

        this.options.chartOptions.width -= this.options.margin.left + this.options.margin.right;
        this.options.chartOptions.height -= this.options.margin.top + this.options.margin.bottom;

        this.options.domainPadding = this.normalizePadding(this.options.domainPadding);
        this.options.xAxisDomain = this.getPaddedDomain(this.options.xAxisDomain,
            [this.options.domainPadding[3], this.options.domainPadding[1]]);
        this.options.yAxisDomain = this.getPaddedDomain(this.options.yAxisDomain,
            [this.options.domainPadding[2], this.options.domainPadding[0]]);

        this.xAxisOptions = {
            orientation: Direction.DOWN,
            ticks: 8,
            scale: this.getScaleType(this.options.xAxisScaleType)
                .domain(this.options.xAxisDomain)
                .range([0, this.options.chartOptions.width])
        };
        this._initialXScale = this.xAxisOptions.scale.copy();
        if (this.options.xAxisLabelFormatFunction) {
            this.xAxisOptions.labelFormatFunction = this.options.xAxisLabelFormatFunction;
        }
        this.yAxisOptions = {
            orientation: Direction.LEFT,
            ticks: 5,
            scale: this.getScaleType(this.options.yAxisScaleType)
                .domain(this.options.yAxisDomain)
                .range([this.options.chartOptions.height, 0])
        };
        this._initialYScale = this.yAxisOptions.scale.copy();
        if (this.options.yAxisLabelFormatFunction) {
            this.yAxisOptions.labelFormatFunction = this.options.yAxisLabelFormatFunction;
        }
    }

    getBackground() {
        return <SVG.Group ref={this.refLink("background")}/>;
    }

    getAxes() {
        return [
            <BasicAxis ref={this.refLink("xAxis")} chartOptions={this.options.chartOptions} {...this.xAxisOptions}/>,
            <BasicAxis ref={this.refLink("yAxis")} chartOptions={this.options.chartOptions} {...this.yAxisOptions}/>
        ];
    }

    render() {
        let interactiveLayer = <SVG.Rect ref={this.refLink("interactiveLayer")} height={this.options.chartOptions.height}
                                             width={this.options.chartOptions.width} style={{cursor: this.options.cursorStyle}} opacity={0}/>;
        // Add a clipPath
        let clipPathDef = <SVG.Defs ref="defs">
                <SVG.ClipPath id={"chartClipPath" + uniqueId(this)}>
                    <SVG.Rect width={this.options.chartOptions.width} height={this.options.chartOptions.height}/>
                </SVG.ClipPath>
            </SVG.Defs>;
        this.clipPath = "url(#chartClipPath" + uniqueId(this) + ")";

        this.translate(this.options.margin.left, this.options.margin.right);

        return [this.getBackground(), ...this.getAxes(), interactiveLayer, ...super.render(), clipPathDef];
    }

    redraw() {
        this.options.children.forEach((child) => {
            child.options.chart = this;
        });
        super.redraw();
    }

    initZoom() {
        this.options.applyZoom = true;
        let zoomNode = select(this.interactiveLayer.node);
        this.zoomListener = () => {
            if (this.options.applyZoom) {
                this.xAxisOptions.scale = event.transform.rescaleX(this._initialXScale);
                this.yAxisOptions.scale = event.transform.rescaleY(this._initialYScale);
                this.redraw();
                if (!event.sourceEvent) {
                    // Custom zoom event
                    this.interactiveLayer.node.__zoom = event.transform;
                }
            }
        };

        this.zoomBehavior = zoom().on("zoom", this.zoomListener);
        zoomNode.call(this.zoomBehavior);
    }

    disableZoom() {
        this.options.applyZoom = false;
    }

    onMount() {
        if (this.options.enableZoom) {
            this.initZoom();
        }
    }

    addZoomListener(func) {
        this.addListener("zoom", func);
    }
}

export class TimeChart extends BasicChart {
    getDefaultOptions() {
        return Object.assign(super.getDefaultOptions(), {
            xAxisScaleType: "time",
            paddingXOnNoPoints: 1000 * 60 * 60 * 24 * 30 * 3,
            paddingYOnNoPoints: 50,
            zoomScaleExtent: [1, 20]
        });
    }

    getTimeFormat() {
        return (unixTime) => {
            let date = new StemDate(unixTime);
            var formatTypes = [
                {name: "Seconds", continueSubdivisionOnValue: 0, format: "HH:mm:ss"},
                {name: "Minutes", continueSubdivisionOnValue: 0, format: "HH:mm"},
                {name: "Hours", continueSubdivisionOnValue: 0, format: "HH:mm"},
                {name: "Date", continueSubdivisionOnValue: 1, format: "DD/MMM"},
                {name: "Month", continueSubdivisionOnValue: 0, format: "MMM"}
            ];

            for (let i = 0; i < formatTypes.length; i += 1) {
                // TODO: this is a bit hacky, should be cleaner (maybe included in Date)
                let subdivisionValue = date["get" + formatTypes[i].name]();
                if (subdivisionValue !== formatTypes[i].continueSubdivisionOnValue) {
                    return date.format(formatTypes[i].format);
                }
            }

            return date.format("YYYY");
        };
    }

    getMinMaxDomain(points, coordinateAlias, padding) {
        let domain = [coordinateAlias(points[0]), coordinateAlias(points[0])];
        points.forEach((point) => {
            domain[0] = Math.min(domain[0], coordinateAlias(point));
            domain[1] = Math.max(domain[1], coordinateAlias(point));
        });
        if (domain[0] === domain[1]) {
            domain[0] -= padding;
            domain[1] += padding;
        }
        return domain;
    }

    defaultXNoPoints(padding=this.options.paddingXOnNoPoints) {
        return [+StemDate.now() - padding, +StemDate.now() + padding];
    }

    getXAxisDomain(points, coordinateAlias, padding=this.options.paddingXOnNoPoints) {
        if (!Array.isArray(points) || points.length === 0) {
            return this.defaultXNoPoints(padding);
        }
        return this.getMinMaxDomain(points, coordinateAlias, padding);
    }

    defaultYNoPoints(padding) {
        return [-padding, padding];
    }

    getYAxisDomain(points, coordinateAlias, padding=this.options.paddingYOnNoPoints) {
        if (!Array.isArray(points) || points.length === 0) {
            return this.defaultYNoPoints(padding);
        }
        return this.getMinMaxDomain(points, coordinateAlias, padding);
    }

    setOptions(options) {
        options.xAxisLabelFormatFunction = this.getTimeFormat();

        // TODO: This REALLY needs a refactoring.
        let paddingXOnNoPoints = options.paddingXOnNoPoints;
        if (paddingXOnNoPoints == null) {
            paddingXOnNoPoints = this.getDefaultOptions().paddingXOnNoPoints;
        }
        let paddingYOnNoPoints = options.paddingYOnNoPoints;
        if (paddingYOnNoPoints == null) {
            paddingYOnNoPoints = this.getDefaultOptions().paddingYOnNoPoints;
        }

        options.xAxisDomain = this.getXAxisDomain(options.plotOptions.pointsAlias(options.data),
            options.plotOptions.xCoordinateAlias, paddingXOnNoPoints);
        options.yAxisDomain = this.getYAxisDomain(options.plotOptions.pointsAlias(options.data),
            options.plotOptions.yCoordinateAlias, paddingYOnNoPoints);
        super.setOptions(options);
    }

    initZoom(infinite=false) {
        this.options.applyZoom = true;
        let zoomNode = d3.select(this.interactiveLayer.node);
        this.zoomListener = () => {
            if (this.options.applyZoom) {
                let x = d3.event.transform.x, y = d3.event.transform.y, k = d3.event.transform.k;
                d3.event.transform.x = Math.min(0, Math.max(x, this.options.chartOptions.width * (1 - k)));
                d3.event.transform.y = Math.min(0, Math.max(y, this.options.chartOptions.height * (1 - k)));
                this.xAxisOptions.scale = d3.event.transform.rescaleX(this._initialXScale);
                this.yAxisOptions.scale = d3.event.transform.rescaleY(this._initialYScale);
                this.redraw();
                this.interactiveLayer.node.__zoom = d3.event.transform;
            }
        };
        this.zoomBehavior = d3.zoom();
        if (!infinite) {
            this.zoomBehavior = this.zoomBehavior.scaleExtent(this.options.zoomScaleExtent);
        }
        this.zoomBehavior = this.zoomBehavior.on("zoom", this.zoomListener);
        zoomNode.call(this.zoomBehavior);

        // Simulate a center zoom
        let factor = 1.2;
        let centerZoom = {
            k: factor,
            x: this.options.chartOptions.width / 2 * (1 - factor),
            y: this.options.chartOptions.height / 2 * (1 - factor)
        };
        centerZoom.__proto__ = d3.zoomIdentity.__proto__;
        d3.customEvent({
            transform: centerZoom
        }, this.zoomListener, zoomNode);
    }
}

export class ChartSVG extends SVG.SVGRoot {
    setOptions(options) {
        super.setOptions(options);
        this.chartOptions = {
            height: options.height || 500,
            width: options.width || 790
        };
        this.plotOptions = {
            pointsAlias: (data) => {return data.points},
            xCoordinateAlias: (data) => {return data.x},
            yCoordinateAlias: (data) => {return data.y}
        };
        this.data = {
            points: [
                {"x" : 30, "y" : 60, "label" : "A"},
                {"x" : 100, "y" : 55, "label" : "C"},
                {"x" : 130, "y" : 55, "label" : "E"},
                {"x" : 115, "y" : 20, "label" : "D"},
                {"x" : 75, "y" : 70, "label" : "B"},
            ]
        };

        // Benchmark - 400 points 26 FPS, 1000 points 13 FPS
        //this.data = {
        //    points: []
        //};
        //for (let i = 0; i <= 400; i += 1) {
        //    this.data.points.push({x: Math.random() * 200, y: Math.random() * 100});
        //}
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setAttribute("height", this.chartOptions.height);
        attr.setAttribute("width", this.chartOptions.width);
        return attr;
    }

    render() {
        return [
            <BasicChart chartOptions={Object.assign({}, this.chartOptions)}
                                xAxisDomain={this.options.xDomain}
                                yAxisDomain={this.options.yDomain}>
                <LinePlot plotOptions={this.plotOptions} data={this.data}/>
                <BasePointPlot plotOptions={this.plotOptions} data={this.data}/>
            </BasicChart>
        ];
    }
}
