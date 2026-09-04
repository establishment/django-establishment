// The parts of d3-shape the charts here use: the linear line and area path generators. No curve
// interpolation is configured anywhere, so a straight join is the whole of it.

export type PointAccessor<Datum> = (datum: Datum, index: number, data: Datum[]) => number;

export interface LineGenerator<Datum> {
    (data: Datum[]): string | null;
    x(accessor: PointAccessor<Datum>): LineGenerator<Datum>;
    y(accessor: PointAccessor<Datum>): LineGenerator<Datum>;
}

export interface AreaGenerator<Datum> {
    (data: Datum[]): string | null;
    x(accessor: PointAccessor<Datum>): AreaGenerator<Datum>;
    y0(accessor: PointAccessor<Datum>): AreaGenerator<Datum>;
    y1(accessor: PointAccessor<Datum>): AreaGenerator<Datum>;
}

// d3 breaks the path wherever a coordinate is not finite, rather than drawing through the gap
function isDrawable(x: number, y: number): boolean {
    return isFinite(x) && isFinite(y);
}

export function line<Datum = [number, number]>(): LineGenerator<Datum> {
    // With no accessor configured a datum is read as the [x, y] pair the type parameter defaults to
    let xAccessor: PointAccessor<Datum> = (datum: Datum & [number, number]) => datum[0];
    let yAccessor: PointAccessor<Datum> = (datum: Datum & [number, number]) => datum[1];

    const generator = ((data: Datum[]) => {
        let path = "";
        let inSegment = false;
        data.forEach((datum, index) => {
            const x = +xAccessor(datum, index, data);
            const y = +yAccessor(datum, index, data);
            if (!isDrawable(x, y)) {
                inSegment = false;
                return;
            }
            path += (inSegment ? "L" : "M") + x + "," + y;
            inSegment = true;
        });
        return path || null;
    }) as LineGenerator<Datum>;

    generator.x = (accessor: PointAccessor<Datum>) => {
        xAccessor = accessor;
        return generator;
    };
    generator.y = (accessor: PointAccessor<Datum>) => {
        yAccessor = accessor;
        return generator;
    };
    return generator;
}

export function area<Datum = [number, number]>(): AreaGenerator<Datum> {
    let xAccessor: PointAccessor<Datum> = (datum: Datum & [number, number]) => datum[0];
    let y0Accessor: PointAccessor<Datum> = () => 0;
    let y1Accessor: PointAccessor<Datum> = (datum: Datum & [number, number]) => datum[1];

    // The upper edge is drawn left to right and the lower edge back again, so the ring closes
    const generator = ((data: Datum[]) => {
        let path = "";
        let segmentTop: string[] = [];
        let segmentBottom: string[] = [];
        const flush = () => {
            if (segmentTop.length === 0) {
                return;
            }
            path += "M" + segmentTop.join("L") + "L" + segmentBottom.reverse().join("L") + "Z";
            segmentTop = [];
            segmentBottom = [];
        };
        data.forEach((datum, index) => {
            const x = +xAccessor(datum, index, data);
            const y0 = +y0Accessor(datum, index, data);
            const y1 = +y1Accessor(datum, index, data);
            if (!isDrawable(x, y0) || !isDrawable(x, y1)) {
                flush();
                return;
            }
            segmentTop.push(x + "," + y1);
            segmentBottom.push(x + "," + y0);
        });
        flush();
        return path || null;
    }) as AreaGenerator<Datum>;

    generator.x = (accessor: PointAccessor<Datum>) => {
        xAccessor = accessor;
        return generator;
    };
    generator.y0 = (accessor: PointAccessor<Datum>) => {
        y0Accessor = accessor;
        return generator;
    };
    generator.y1 = (accessor: PointAccessor<Datum>) => {
        y1Accessor = accessor;
        return generator;
    };
    return generator;
}
