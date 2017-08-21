import {UI, SVG} from "UI";

class PointPlotElement extends SVG.Circle {
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

const PointPlot = (PointPlotElementClass) => class PointPlot extends SVG.Group {
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

const BasePointPlot = PointPlot(PointPlotElement);

export {PointPlot, PointPlotElement, BasePointPlot};