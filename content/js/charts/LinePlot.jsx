import {UI, SVG} from "UI";
import {line} from "d3";

class LinePlot extends SVG.Path {
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