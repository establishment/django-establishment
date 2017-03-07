import {UI} from "UI";
import "BasicChart";
import d3 from "d3";

UI.SVG.LinePlot = class LinePlot extends UI.SVG.Path {
    static getDefaultOptions() {
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
        // TODO: no D3 here
        this.linePathGenerator = d3.svg.line()
            .x((data) => {return this.options.chart.xAxisOptions.scale(this.options.plotOptions.xCoordinateAlias(data))})
            .y((data) => {return this.options.chart.yAxisOptions.scale(this.options.plotOptions.yCoordinateAlias(data))})
            .interpolate(this.options.interpolation);
        return this.linePathGenerator(this.options.plotOptions.pointsAlias(this.options.data));
    }

    onMount() {
        this.options.chart.addZoomListener(() => {
            this.redraw();
        });
    }
};
