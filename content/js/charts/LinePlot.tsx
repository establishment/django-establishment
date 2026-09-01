import {UI, type ExtendedOptions} from "../../../../stemjs/ui/UIBase";
import {SVGPath} from "../../../../stemjs/ui/svg/SVGPrimitives";
import {line} from "./Shape";
import {type PlotOptions, type BasicChart} from "./BasicChart";

export interface LinePlotOptions {
    chart?: BasicChart;
    data?: any;
    plotOptions?: PlotOptions;
}

class LinePlot extends SVGPath {
    declare options: ExtendedOptions<SVGPath, LinePlotOptions>;
    declare linePathGenerator: any;

    getDefaultOptions() {
        return {
            d: "",
            fill: "none",
            stroke: "darkgrey",
            strokeWidth: 1.5,
            interpolation: "linear"
        };
    }

    setOptions(options) {
        Object.assign(options, this.options.plotOptions);
        super.setOptions(options);
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setAttribute("d", this.getLineData());
        attr.setAttribute("clip-path", this.options.chart.clipPath);
        return attr;
    }

    getLineData() {
        this.linePathGenerator = line()
            .x((data) => {return this.options.chart.xAxisOptions.scale(this.options.plotOptions.xCoordinateAlias(data))})
            .y((data) => {return this.options.chart.yAxisOptions.scale(this.options.plotOptions.yCoordinateAlias(data))});
        return this.linePathGenerator(this.options.plotOptions.pointsAlias(this.options.data));
    }

    onMount() {
        this.options.chart.addZoomListener(() => {
            this.redraw();
        });
    }
}

export {LinePlot};