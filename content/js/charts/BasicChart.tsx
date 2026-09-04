import {UI, type ExtendedOptions, type UIElement} from "../../../../stemjs/ui/UIBase";
import {SVGText} from "../../../../stemjs/ui/svg/SVGText";
import {Direction, type DirectionType} from "../../../../stemjs/ui/Constants";
import {uniqueId} from "../../../../stemjs/base/Utils";
import {StemDate} from "../../../../stemjs/time/Date";
import {LinePlot} from "./LinePlot";
import {BasePointPlot} from "./PointPlot";

import {scaleLinear, scaleTime, type ContinuousScale} from "./Scale";

import {select} from "d3-selection";
import {zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior} from "d3-zoom";
import {SVGRoot, SVGGroup, SVGLine, SVGRect} from "../../../../stemjs/ui/svg/SVGPrimitives";

// The pixel box a chart draws inside
export interface ChartDimensions {
    width: number;
    height: number;
}

// How a plot reads its points out of whatever data it was handed
export interface PlotOptions {
    pointsAlias: (data: any) => any[];
    xCoordinateAlias: (point: any) => number;
    yCoordinateAlias: (point: any) => number;
}

// What an axis needs to draw itself
export interface ChartAxisOptions {
    orientation: DirectionType;
    ticks: number;
    scale: ContinuousScale;
    labelFormatFunction?: (value: any) => string;
}


// TODO: This file desperately needs a refactoring.

export interface AxisTickOptions {
    axisLineLength?: number;
    chartOptions?: ChartDimensions;
    gridLineStroke?: string;
    label?: string | number;
    labelPadding?: number;
    labelStrokeWidth?: number;
    orientation?: DirectionType;
    scale?: ContinuousScale;
    // A tick, in whatever the scale's domain is
    value?: any;
}

export class AxisTick extends SVGGroup {
    declare gridLine: SVGLine;

    declare options: ExtendedOptions<SVGGroup, AxisTickOptions>;
    declare axisPosition: number;

    getDefaultOptions() {
        return {
            axisLineLength: 6,
            gridLineStroke: "rgba(255, 255, 255, .7)",
            labelPadding: 6,
            labelStrokeWidth: 0.5
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
        return <SVGText ref={this.refLink("label")} {...labelOptions}/>;
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
        return <SVGLine ref={this.refLink("gridLine")} {...gridLineOptions}/>;
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
        return <SVGLine ref={this.refLink("axisLine")} {...axisLineOptions}/>
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

export interface BasicAxisOptions {
    chartOptions?: ChartDimensions;
    labelFormatFunction?: ChartAxisOptions["labelFormatFunction"];
    orientation?: DirectionType;
    scale?: ContinuousScale;
    ticks?: number;
}

export class BasicAxis extends SVGGroup {
    declare options: ExtendedOptions<SVGGroup, BasicAxisOptions>;
    declare axisLength: number;
    declare tickValues: any[];
    declare ticks: AxisTick[];

    getDefaultOptions() {
        return {
            labelFormatFunction: (x: number) => {return x;}
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
        return <SVGLine ref={this.refLink("axisLine")} {...axisLineOptions}/>;
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

// The chart writes itself onto each child in redraw, and every plot reads it back off its own options.
// A plot draws into the chart's SVG, so its node is an SVG one rather than the HTML element UIElement defaults to.
export type ChartChild = UIElement<any, SVGElement | HTMLElement, any> & {options: {chart?: BasicChart}};

export interface BasicChartOptions {
    children?: ChartChild[];
    applyZoom?: boolean;
    chartOptions?: ChartDimensions;
    cursorStyle?: string;
    // One, two, three or four numbers, normalized to four before it is read
    domainPadding?: number[];
    enableZoom?: boolean;
    margin?: {top: number, bottom: number, left: number, right: number};
    xAxisDomain?: any[];
    xAxisLabelFormatFunction?: ChartAxisOptions["labelFormatFunction"];
    xAxisScaleType?: string;
    yAxisDomain?: any[];
    yAxisLabelFormatFunction?: ChartAxisOptions["labelFormatFunction"];
    yAxisScaleType?: string;
}

export class BasicChart extends SVGGroup {
    declare interactiveLayer: SVGRect;

    declare options: ExtendedOptions<SVGGroup, BasicChartOptions>;
    declare _initialXScale: ContinuousScale;
    declare _initialYScale: ContinuousScale;
    declare clipPath: string;
    declare xAxisOptions: ChartAxisOptions;
    declare yAxisOptions: ChartAxisOptions;
    declare zoomBehavior: ZoomBehavior<Element, unknown>;
    declare zoomListener: (event: D3ZoomEvent<Element, unknown>) => void;

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
            console.error("BasicChart.normalizePadding receives invalid padding array: ", padding);
            return null;
        }
    }

    getPaddedDomain(domain, padding) {
        let domainLength = domain[1] - domain[0];
        return [domain[0] - padding[0] * domainLength, domain[1] + padding[1] * domainLength];
    }

    getScaleType(type: string): ContinuousScale {
        if (type === "linear") {
            return scaleLinear();
        } else if (type === "time") {
            return scaleTime();
        }
    }

    setOptions(options: typeof this.options) {
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
        return <SVGGroup ref={this.refLink("background")}/>;
    }

    getAxes() {
        return [
            <BasicAxis ref={this.refLink("xAxis")} chartOptions={this.options.chartOptions} {...this.xAxisOptions}/>,
            <BasicAxis ref={this.refLink("yAxis")} chartOptions={this.options.chartOptions} {...this.yAxisOptions}/>
        ];
    }

    render() {
        let interactiveLayer = <SVGRect ref={this.refLink("interactiveLayer")} height={this.options.chartOptions.height}
                                             width={this.options.chartOptions.width} style={{cursor: this.options.cursorStyle}} opacity={0}/>;
        // Add a clipPath
        let clipPathDef = <defs ref="defs">
                <clipPath id={"chartClipPath" + uniqueId(this)}>
                    <SVGRect width={this.options.chartOptions.width} height={this.options.chartOptions.height}/>
                </clipPath>
            </defs>;
        this.clipPath = "url(#chartClipPath" + uniqueId(this) + ")";

        this.translate(this.options.margin.left, this.options.margin.right);

        // The base's render answers with this element's own children, which are an array here
        return [this.getBackground(), ...this.getAxes(), interactiveLayer, ...(super.render() as UIElement[]), clipPathDef];
    }

    redraw() {
        // The intersection with the base's wider children is what makes the annotation earn its place
        const plots: ChartChild[] = this.options.children;
        plots.forEach((plot) => {
            plot.options.chart = this;
        });
        super.redraw();
    }

    initZoom() {
        this.options.applyZoom = true;
        let zoomNode = select(this.interactiveLayer.node);
        this.zoomListener = (event) => {
            if (this.options.applyZoom) {
                // d3 types rescaleX as answering with the narrower ZoomScale, though it copies what it was given
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

export interface TimeChartOptions {
    applyZoom?: boolean;
    chartOptions?: ChartDimensions;
    data?: any;
    plotOptions?: PlotOptions;
    paddingXOnNoPoints?: number;
    paddingYOnNoPoints?: number;
    zoomScaleExtent?: [number, number];
}

export class TimeChart extends BasicChart {

    declare options: ExtendedOptions<BasicChart, TimeChartOptions>;

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

    setOptions(options: typeof this.options) {
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

    initZoom(infinite: boolean = false) {
        this.options.applyZoom = true;
        let zoomNode = select(this.interactiveLayer.node);
        this.zoomListener = (event) => {
            if (this.options.applyZoom) {
                let x = event.transform.x, y = event.transform.y, k = event.transform.k;
                // A transform is a value object, so the pan is clamped into a new one rather than written
                // back into the event's, and that new one is what d3 keeps on the node
                const transform = zoomIdentity
                    .translate(Math.min(0, Math.max(x, this.options.chartOptions.width * (1 - k))),
                               Math.min(0, Math.max(y, this.options.chartOptions.height * (1 - k))))
                    .scale(k);
                this.xAxisOptions.scale = transform.rescaleX(this._initialXScale);
                this.yAxisOptions.scale = transform.rescaleY(this._initialYScale);
                this.redraw();
                this.interactiveLayer.node.__zoom = transform;
            }
        };
        this.zoomBehavior = zoom();
        if (!infinite) {
            this.zoomBehavior = this.zoomBehavior.scaleExtent(this.options.zoomScaleExtent);
        }
        this.zoomBehavior = this.zoomBehavior.on("zoom", this.zoomListener);
        zoomNode.call(this.zoomBehavior);
    }
}

export interface ChartSVGOptions {
    // The chart's dimensions, which are numbers rather than the lengths an element takes
    height?: number;
    width?: number;
    xDomain?: any[];
    yDomain?: any[];
}

export class ChartSVG extends SVGRoot {
    declare options: ExtendedOptions<SVGRoot, ChartSVGOptions>;
    declare chartOptions: ChartDimensions;
    // The demo dataset this base draws, which every real chart replaces with its own
    declare data: {points: {x: number, y: number, label?: string}[]};
    declare plotOptions: PlotOptions;

    setOptions(options: typeof this.options) {
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
                {x : 30, y : 60, "label" : "A"},
                {x : 100, y : 55, "label" : "C"},
                {x : 130, y : 55, "label" : "E"},
                {x : 115, y : 20, "label" : "D"},
                {x : 75, y : 70, "label" : "B"},
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
            <BasicChart chartOptions={{...this.chartOptions}}
                                xAxisDomain={this.options.xDomain}
                                yAxisDomain={this.options.yDomain}>
                <LinePlot plotOptions={this.plotOptions} data={this.data}/>
                <BasePointPlot plotOptions={this.plotOptions} data={this.data}/>
            </BasicChart>
        ];
    }
}
