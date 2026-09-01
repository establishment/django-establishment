// The parts of d3-scale the charts here use: a continuous domain-to-range mapping, plus the tick
// selection d3 performs, so axis labels land exactly where they always have.

export interface ContinuousScale {
    (value: any): number;
    domain(values: any[]): ContinuousScale;
    domain(): any[];
    range(values: number[]): ContinuousScale;
    range(): number[];
    invert(value: number): any;
    copy(): ContinuousScale;
    ticks(count?: number): any[];
}

const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.sqrt(2);

// d3-array's tickSpec: the step is a power of ten times 1, 2, 5 or 10, and the bounds are rounded
// then nudged inwards so every tick lands inside the domain
function tickSpec(start: number, stop: number, count: number): [number, number, number] {
    const step = (stop - start) / Math.max(0, count);
    const power = Math.floor(Math.log10(step));
    const error = step / Math.pow(10, power);
    const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1;
    let first: number;
    let last: number;
    let increment: number;
    if (power < 0) {
        increment = Math.pow(10, -power) / factor;
        first = Math.round(start * increment);
        last = Math.round(stop * increment);
        if (first / increment < start) {
            first += 1;
        }
        if (last / increment > stop) {
            last -= 1;
        }
        increment = -increment;
    } else {
        increment = Math.pow(10, power) * factor;
        first = Math.round(start / increment);
        last = Math.round(stop / increment);
        if (first * increment < start) {
            first += 1;
        }
        if (last * increment > stop) {
            last -= 1;
        }
    }
    // A single requested tick can leave no room at all, so d3 asks again for twice as many
    if (last < first && 0.5 <= count && count < 2) {
        return tickSpec(start, stop, count * 2);
    }
    return [first, last, increment];
}

// A negative increment means the step is a fraction, which is divided rather than multiplied to
// keep the tick values exact
export function numericTicks(start: number, stop: number, count: number): number[] {
    if (start === stop && count > 0) {
        return [start];
    }
    const reverse = stop < start;
    if (reverse) {
        [start, stop] = [stop, start];
    }
    const [first, last, increment] = tickSpec(start, stop, count);
    if (!(last >= first)) {
        return [];
    }
    const ticks: number[] = new Array(last - first + 1);
    for (let i = 0; i < ticks.length; i += 1) {
        ticks[i] = increment > 0 ? (first + i) * increment : (first + i) / -increment;
    }
    return reverse ? ticks.reverse() : ticks;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

// d3-array's tickStep is the increment tickSpec settles on, retry included
function tickStep(start: number, stop: number, count: number): number {
    return tickSpec(start, stop, count)[2];
}

// A calendar unit: floor to it, advance by one of it, and read the field d3 filters a multi-unit
// step on. Filtering rather than stepping is what keeps ticks anchored to the clock, so a 15-minute
// step lands on :00 :15 :30 :45 rather than 15 minutes after wherever the domain happens to start.
interface TimeUnit {
    floor: (date: Date) => void;
    next: (date: Date) => void;
    field: (date: Date) => number;
    duration: number;
}

const UNIT_SECOND: TimeUnit = {
    floor: d => d.setMilliseconds(0),
    next: d => d.setSeconds(d.getSeconds() + 1),
    field: d => d.getSeconds(),
    duration: SECOND,
};
const UNIT_MINUTE: TimeUnit = {
    floor: d => { d.setMilliseconds(0); d.setSeconds(0); },
    next: d => d.setMinutes(d.getMinutes() + 1),
    field: d => d.getMinutes(),
    duration: MINUTE,
};
const UNIT_HOUR: TimeUnit = {
    floor: d => { d.setMilliseconds(0); d.setSeconds(0); d.setMinutes(0); },
    next: d => d.setHours(d.getHours() + 1),
    field: d => d.getHours(),
    duration: HOUR,
};
const UNIT_DAY: TimeUnit = {
    floor: d => d.setHours(0, 0, 0, 0),
    next: d => d.setDate(d.getDate() + 1),
    field: d => d.getDate() - 1,
    duration: DAY,
};
// A week is the Sunday at or before the date, and is only ever used with a step of one
const UNIT_WEEK: TimeUnit = {
    floor: d => { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); },
    next: d => d.setDate(d.getDate() + 7),
    field: () => 0,
    duration: WEEK,
};
const UNIT_MONTH: TimeUnit = {
    floor: d => { d.setHours(0, 0, 0, 0); d.setDate(1); },
    next: d => d.setMonth(d.getMonth() + 1),
    field: d => d.getMonth(),
    duration: MONTH,
};
const UNIT_YEAR: TimeUnit = {
    floor: d => { d.setHours(0, 0, 0, 0); d.setMonth(0, 1); },
    next: d => d.setFullYear(d.getFullYear() + 1),
    field: d => d.getFullYear(),
    duration: YEAR,
};

const TIME_INTERVALS: {unit: TimeUnit; step: number; duration: number}[] = [
    {unit: UNIT_SECOND, step: 1, duration: SECOND},
    {unit: UNIT_SECOND, step: 5, duration: 5 * SECOND},
    {unit: UNIT_SECOND, step: 15, duration: 15 * SECOND},
    {unit: UNIT_SECOND, step: 30, duration: 30 * SECOND},
    {unit: UNIT_MINUTE, step: 1, duration: MINUTE},
    {unit: UNIT_MINUTE, step: 5, duration: 5 * MINUTE},
    {unit: UNIT_MINUTE, step: 15, duration: 15 * MINUTE},
    {unit: UNIT_MINUTE, step: 30, duration: 30 * MINUTE},
    {unit: UNIT_HOUR, step: 1, duration: HOUR},
    {unit: UNIT_HOUR, step: 3, duration: 3 * HOUR},
    {unit: UNIT_HOUR, step: 6, duration: 6 * HOUR},
    {unit: UNIT_HOUR, step: 12, duration: 12 * HOUR},
    {unit: UNIT_DAY, step: 1, duration: DAY},
    {unit: UNIT_DAY, step: 2, duration: 2 * DAY},
    {unit: UNIT_WEEK, step: 1, duration: WEEK},
    {unit: UNIT_MONTH, step: 1, duration: MONTH},
    {unit: UNIT_MONTH, step: 3, duration: 3 * MONTH},
    {unit: UNIT_YEAR, step: 1, duration: YEAR},
];

function unitRange(unit: TimeUnit, step: number, start: number, stop: number): Date[] {
    const current = new Date(start);
    unit.floor(current);
    if (current.getTime() < start) {
        unit.next(current);
    }
    const ticks: Date[] = [];
    while (current.getTime() < stop) {
        if (step === 1 || unit.field(current) % step === 0) {
            ticks.push(new Date(current.getTime()));
        }
        unit.next(current);
    }
    return ticks;
}

// d3 bisects the table on duration, then picks the neighbour whose duration is the better ratio
// match rather than the smaller absolute difference
export function timeTicks(start: number, stop: number, count: number): Date[] {
    if (stop < start) {
        return timeTicks(stop, start, count).reverse();
    }
    const target = Math.abs(stop - start) / count;
    let index = TIME_INTERVALS.length;
    for (let i = 0; i < TIME_INTERVALS.length; i += 1) {
        if (TIME_INTERVALS[i].duration > target) {
            index = i;
            break;
        }
    }
    // Past the last entry the ticks are whole years, and a step that floors to nothing yields none
    if (index === TIME_INTERVALS.length) {
        const step = Math.floor(tickStep(start / YEAR, stop / YEAR, count));
        if (!isFinite(step) || step <= 0) {
            return [];
        }
        return unitRange(UNIT_YEAR, step, start, stop + 1);
    }
    // Below the first, the domain is short enough that plain millisecond ticks are what d3 uses
    if (index === 0) {
        const step = Math.max(tickStep(start, stop, count), 1);
        const ticks: number[] = [];
        for (let value = Math.ceil(start / step) * step; value < stop + 1; value += step) {
            ticks.push(value);
        }
        return ticks.map(value => new Date(value));
    }
    const lower = TIME_INTERVALS[index - 1];
    const upper = TIME_INTERVALS[index];
    const chosen = target / lower.duration < upper.duration / target ? lower : upper;
    return unitRange(chosen.unit, chosen.step, start, stop + 1);
}

function makeScale(isTime: boolean): ContinuousScale {
    let domain: number[] = [0, 1];
    let range: number[] = [0, 1];

    const scale = ((value: any) => {
        const [d0, d1] = domain;
        const [r0, r1] = range;
        if (d1 === d0) {
            return r0;
        }
        return r0 + (Number(value) - d0) / (d1 - d0) * (r1 - r0);
    }) as ContinuousScale;

    scale.domain = ((values?: any[]) => {
        if (values === undefined) {
            return isTime ? domain.map(value => new Date(value)) : domain.slice();
        }
        domain = values.map(Number);
        return scale;
    }) as ContinuousScale["domain"];

    scale.range = ((values?: number[]) => {
        if (values === undefined) {
            return range.slice();
        }
        range = values.map(Number);
        return scale;
    }) as ContinuousScale["range"];

    scale.invert = (value: number) => {
        const [d0, d1] = domain;
        const [r0, r1] = range;
        const inverted = r1 === r0 ? d0 : d0 + (value - r0) / (r1 - r0) * (d1 - d0);
        return isTime ? new Date(inverted) : inverted;
    };

    scale.copy = () => {
        const other = makeScale(isTime);
        other.domain(isTime ? domain.map(value => new Date(value)) : domain);
        other.range(range);
        return other;
    };

    scale.ticks = (count: number = 10) => {
        return isTime ? timeTicks(domain[0], domain[1], count) : numericTicks(domain[0], domain[1], count);
    };

    return scale;
}

export function scaleLinear(): ContinuousScale {
    return makeScale(false);
}

export function scaleTime(): ContinuousScale {
    return makeScale(true);
}
