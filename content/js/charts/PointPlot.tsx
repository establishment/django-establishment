import {UI, type ExtendedOptions} from "../../../../stemjs/ui/UIBase";
import {SVGCircle, SVGGroup} from "../../../../stemjs/ui/svg/SVGPrimitives";
import {type SVGUIElement} from "../../../../stemjs/ui/svg/SVGBase";
import {type PlotOptions, type BasicChart} from "./BasicChart";
import {type ContinuousScale} from "./Scale";

export interface PointPlotElementOptions {
    // One entry of whatever the chart was handed, which only the aliases below know how to read
    data?: any;
    xAxisScale?: ContinuousScale;
    xCoordinateAlias?: PlotOptions["xCoordinateAlias"];
    yAxisScale?: ContinuousScale;
    yCoordinateAlias?: PlotOptions["yCoordinateAlias"];
}

export class PointPlotElement extends SVGCircle {
    declare options: ExtendedOptions<SVGCircle, PointPlotElementOptions>;

    getDefaultOptions() {
        return {
            center: {x: 0, y: 0},
            radius: 5,
            fill: "grey",
            strokeWidth: 0.5,
            stroke: "darkgrey"
        };
    }

    redraw() {
        //this.options.center = {
        //    x: this.options.xAxisScale(this.options.xCoordinateAlias(this.options.data)),
        //    y: this.options.yAxisScale(this.options.yCoordinateAlias(this.options.data))
        //};
        this.translate(this.options.xAxisScale(this.options.xCoordinateAlias(this.options.data)),
                       this.options.yAxisScale(this.options.yCoordinateAlias(this.options.data)));
        super.redraw();
    }
}

export interface PointPlotOptions {
    chart?: BasicChart;
    data?: any;
    plotOptions?: PlotOptions;
}

export const PointPlot = (PointPlotElementClass) => class PointPlot extends SVGGroup {
    declare options: ExtendedOptions<SVGGroup, PointPlotOptions>;
    // The factory's own element class, one per datum the alias pulled out
    declare points: SVGUIElement[];
    declare pointsData: any[];

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setAttribute("clip-path", this.options.chart.clipPath);
        return attr;
    }

    getPoints() {
        this.points = [];
        this.pointsData = this.options.plotOptions.pointsAlias(this.options.data);
        for (let i = 0; i < this.pointsData.length; i += 1) {
            this.points[i] = <PointPlotElementClass ref={this.refLinkArray("points", i)} {...this.options.plotOptions}
                                                      data={this.pointsData[i]}
                                                      xAxisScale={this.options.chart.xAxisOptions.scale}
                                                      yAxisScale={this.options.chart.yAxisOptions.scale}/>;
        }
        return this.points;
    }

    render() {
        return [...this.getPoints()];
    }

    onMount() {
        this.options.chart.addZoomListener(() => {
            this.redraw();
        });
    }
};

export const BasePointPlot = PointPlot(PointPlotElement);
