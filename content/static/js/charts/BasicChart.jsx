// TODO: write own custom Scale
import {UI} from "UI";
import d3 from "d3";

UI.SVG.AxisTick = class AxisTick extends UI.SVG.Group {
    static getDefaultOptions() {
        return {
            gridLineLength: 0,
            axisLineLength: 6,
            gridLineStroke: "#EEE",
            labelPadding: 3,
            labelStrokeWidth: 0.5,
            labelFontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
        };
    }

    getLabel() {
        let labelOptions = {
            text: "" + this.options.label,
            strokeWidth: this.options.labelStrokeWidth
        };
        if (this.options.orientation === UI.Direction.DOWN) {
            Object.assign(labelOptions, {
                textAnchor: "middle",
                dy: ".71em",
                y: this.options.labelPadding + this.options.axisLineLength
            });
        } else if (this.options.orientation === UI.Direction.LEFT) {
            Object.assign(labelOptions, {
                textAnchor: "end",
                dy: ".35em",
                x: -1 * (this.options.labelPadding + this.options.axisLineLength)
            });
        }
        return <UI.SVG.Text ref={this.refLink("label")} {...labelOptions}/>;
    }

    getGridLine() {
        let gridLineOptions = {
            fill: this.options.gridLineStroke,
            stroke: this.options.gridLineStroke
        };
        if (this.axisPosition === this.options.scale.range()[0]) {
            return;
        }
        if (this.options.orientation === UI.Direction.DOWN) {
            Object.assign(gridLineOptions, {
                y2: -1 * this.options.chartOptions.height
            });
        } else if (this.options.orientation === UI.Direction.LEFT) {
            Object.assign(gridLineOptions, {
                x2: this.options.chartOptions.width
            });
        }
        return <UI.SVG.Line ref={this.refLink("gridLine")} {...gridLineOptions}/>;
    }

    getAxisLine() {
        let axisLineOptions = {};
        if (this.options.orientation === UI.Direction.DOWN) {
            Object.assign(axisLineOptions, {
                y2: this.options.axisLineLength
            });
        } else if (this.options.orientation === UI.Direction.LEFT) {
            Object.assign(axisLineOptions, {
                x2: -1 * this.options.axisLineLength
            });
        }
        return <UI.SVG.Line ref={this.refLink("axisLine")} {...axisLineOptions}/>
    }

    render() {
        this.axisPosition = this.options.scale(this.options.value);

        if (this.options.orientation === UI.Direction.DOWN) {
            this.translate(this.axisPosition, 0);
        } else if (this.options.orientation === UI.Direction.LEFT) {
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
};

UI.SVG.BasicAxis = class BasicAxis extends UI.SVG.Group {
    static getDefaultOptions() {
        return {
            labelFormatFunction: (x) => {return x;}
        };
    }

    getAxisLine() {
        let axisLineOptions = {};
        if (this.options.orientation === UI.Direction.DOWN) {
            Object.assign(axisLineOptions, {
                x2: this.options.chartOptions.width
            });
            this.axisLength = this.options.chartOptions.width;
        } else if (this.options.orientation === UI.Direction.LEFT) {
            Object.assign(axisLineOptions, {
                y2: this.options.chartOptions.height
            });
            this.axisLength = this.options.chartOptions.height;
        }
        return <UI.SVG.Line ref={this.refLink("axisLine")} {...axisLineOptions}/>;
    }

    getTicks() {
        this.ticks = [];
        this.tickValues = this.options.scale.ticks(this.options.ticks);
        for (let i = 0; i < this.tickValues.length; i += 1) {
            let tickValue = this.tickValues[i];
            this.ticks[i] = <UI.SVG.AxisTick ref={this.refLinkArray("ticks", i)} chartOptions={this.options.chartOptions}
                                             scale={this.options.scale} orientation={this.options.orientation}
                                             value={tickValue} label={this.options.labelFormatFunction(tickValue)}/>;
        }
        return this.ticks;
    }

    render() {
        if (this.options.orientation === UI.Direction.DOWN) {
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
};

UI.SVG.BasicChart = class BasicChart extends UI.SVG.Group {
    static getDefaultOptions() {
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

    setOptions(options) {
        super.setOptions(options);

        this.options.chartOptions.width -= this.options.margin.left + this.options.margin.right;
        this.options.chartOptions.height -= this.options.margin.top + this.options.margin.bottom;

        this.options.domainPadding = this.normalizePadding(this.options.domainPadding);
        this.options.xAxisDomain = this.getPaddedDomain(this.options.xAxisDomain,
            [this.options.domainPadding[3], this.options.domainPadding[1]]);
        this.options.yAxisDomain = this.getPaddedDomain(this.options.yAxisDomain,
            [this.options.domainPadding[2], this.options.domainPadding[0]]);

        let scaleType = (type) => {
            if (type === "linear") {
                return d3.scale.linear();
            } else if (type === "time") {
                return d3.time.scale();
            }
        };

        this.xAxisOptions = {
            orientation: UI.Direction.DOWN,
            ticks: 16,
            scale: scaleType(this.options.xAxisScaleType)
                .domain(this.options.xAxisDomain)
                .range([0, this.options.chartOptions.width])
        };
        if (this.options.xAxisLabelFormatFunction) {
            this.xAxisOptions.labelFormatFunction = this.options.xAxisLabelFormatFunction;
        }
        this.yAxisOptions = {
            orientation: UI.Direction.LEFT,
            ticks: 10,
            scale: scaleType(this.options.yAxisScaleType)
                .domain(this.options.yAxisDomain)
                .range([this.options.chartOptions.height, 0])
        };
        if (this.options.yAxisLabelFormatFunction) {
            this.yAxisOptions.labelFormatFunction = this.options.yAxisLabelFormatFunction;
        }
    }

    getBackground() {
        return <UI.SVG.Group ref={this.refLink("background")}/>;
    }

    getAxes() {
        return [
            <UI.SVG.BasicAxis ref={this.refLink("xAxis")} chartOptions={this.options.chartOptions} {...this.xAxisOptions}/>,
            <UI.SVG.BasicAxis ref={this.refLink("yAxis")} chartOptions={this.options.chartOptions} {...this.yAxisOptions}/>
        ];
    }

    render() {
        this.interactiveLayer = <UI.SVG.Rect ref={this.refLink("interactiveLayer")} height={this.options.chartOptions.height}
                                             width={this.options.chartOptions.width} style={{cursor: this.options.cursorStyle}} opacity={0}/>;

        // Add a clipPath
        let clipPathDef = <UI.SVG.Defs ref="defs">
                <UI.SVG.ClipPath id={"chartClipPath" + this.uniqueId()}>
                    <UI.SVG.Rect width={this.options.chartOptions.width} height={this.options.chartOptions.height}/>
                </UI.SVG.ClipPath>
            </UI.SVG.Defs>;
        this.clipPath = "url(#chartClipPath" + this.uniqueId() + ")";

        this.translate(this.options.margin.left, this.options.margin.right);

        return [this.getBackground(), ...this.getAxes(), this.interactiveLayer, ...super.render(), clipPathDef];
    }

    redraw() {
        this.options.children.forEach((child) => {
            child.options.chart = this;
        });
        super.redraw();
    }

    initZoom() {
        this.zoomBehavior = d3.behavior.zoom()
            .x(this.xAxisOptions.scale)
            .y(this.yAxisOptions.scale)
            .on("zoom", () => {
                this.redraw();
            });

        this.zoomBehavior(d3.select(this.interactiveLayer.node));
    }

    onMount() {
        if (this.options.enableZoom) {
            this.initZoom();
        }
    }

    addZoomListener(func) {
        this.addListener("zoom", func);
    }
};

UI.SVG.ChartSVG = class ChartSVG extends UI.SVG.SVGRoot {
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
        let PointPlot = UI.SVG.PointPlot(UI.SVG.PointPlotElement);
        return [
            <UI.SVG.BasicChart chartOptions={Object.assign({}, this.chartOptions)}
                                xAxisDomain={this.options.xDomain}
                                yAxisDomain={this.options.yDomain}>
                <UI.SVG.LinePlot plotOptions={this.plotOptions} data={this.data}/>
                <PointPlot plotOptions={this.plotOptions} data={this.data}/>
            </UI.SVG.BasicChart>
        ];
    }
};
