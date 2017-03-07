define(["exports", "katex_utils", "katex_ParseError"], function(exports, utils, ParseError) {
    function defineFunction(names, props, handler) {
        if (typeof names === "string") {
            names = [names];
        }
        if (typeof props === "number") {
            props = { numArgs: props };
        }
        // Set default values of functions
        var data = {
            numArgs: props.numArgs,
            argTypes: props.argTypes,
            greediness: (props.greediness === undefined) ? 1 : props.greediness,
            allowedInText: !!props.allowedInText,
            numOptionalArgs: props.numOptionalArgs || 0,
            handler: handler,
        };
        for (var i = 0; i < names.length; ++i) {
            exports[names[i]] = data;
        }
    }

    // A normal square root
    defineFunction("\\sqrt", {
        numArgs: 1,
        numOptionalArgs: 1,
    }, function(context, args) {
        var index = args[0];
        var body = args[1];
        return {
            type: "sqrt",
            body: body,
            index: index,
        };
    });

    // Some non-mathy text
    defineFunction("\\text", {
        numArgs: 1,
        argTypes: ["text"],
        greediness: 2,
    }, function(context, args) {
        var body = args[0];
        // Since the corresponding buildHTML/buildMathML function expects a
        // list of elements, we normalize for different kinds of arguments
        // TODO(emily): maybe this should be done somewhere else
        var inner;
        if (body.type === "ordgroup") {
            inner = body.value;
        } else {
            inner = [body];
        }

        return {
            type: "text",
            body: inner,
        };
    });

    // A two-argument custom color
    defineFunction("\\color", {
        numArgs: 2,
        allowedInText: true,
        greediness: 3,
        argTypes: ["color", "original"],
    }, function(context, args) {
        var color = args[0];
        var body = args[1];
        // Normalize the different kinds of bodies (see \text above)
        var inner;
        if (body.type === "ordgroup") {
            inner = body.value;
        } else {
            inner = [body];
        }

        return {
            type: "color",
            color: color.value,
            value: inner,
        };
    });

    // An overline
    defineFunction("\\overline", {
        numArgs: 1,
    }, function(context, args) {
        var body = args[0];
        return {
            type: "overline",
            body: body,
        };
    });

    // An underline
    defineFunction("\\underline", {
        numArgs: 1,
    }, function(context, args) {
        var body = args[0];
        return {
            type: "underline",
            body: body,
        };
    });

    // A box of the width and height
    defineFunction("\\rule", {
        numArgs: 2,
        numOptionalArgs: 1,
        argTypes: ["size", "size", "size"],
    }, function(context, args) {
        var shift = args[0];
        var width = args[1];
        var height = args[2];
        return {
            type: "rule",
            shift: shift && shift.value,
            width: width.value,
            height: height.value,
        };
    });

    defineFunction("\\kern", {
        numArgs: 1,
        argTypes: ["size"],
    }, function(context, args) {
        return {
            type: "kern",
            dimension: args[0].value,
        };
    });

    // A KaTeX logo
    defineFunction("\\KaTeX", {
        numArgs: 0,
    }, function(context) {
        return {
            type: "katex",
        };
    });

    defineFunction("\\phantom", {
        numArgs: 1,
    }, function(context, args) {
        var body = args[0];
        var inner;
        if (body.type === "ordgroup") {
            inner = body.value;
        } else {
            inner = [body];
        }

        return {
            type: "phantom",
            value: inner,
        };
    });

    // Extra data needed for the delimiter handler down below
    var delimiterSizes = {
        "\\bigl" : {type: "open",    size: 1},
        "\\Bigl" : {type: "open",    size: 2},
        "\\biggl": {type: "open",    size: 3},
        "\\Biggl": {type: "open",    size: 4},
        "\\bigr" : {type: "close",   size: 1},
        "\\Bigr" : {type: "close",   size: 2},
        "\\biggr": {type: "close",   size: 3},
        "\\Biggr": {type: "close",   size: 4},
        "\\bigm" : {type: "rel",     size: 1},
        "\\Bigm" : {type: "rel",     size: 2},
        "\\biggm": {type: "rel",     size: 3},
        "\\Biggm": {type: "rel",     size: 4},
        "\\big"  : {type: "textord", size: 1},
        "\\Big"  : {type: "textord", size: 2},
        "\\bigg" : {type: "textord", size: 3},
        "\\Bigg" : {type: "textord", size: 4},
    };

    var delimiters = [
        "(", ")", "[", "\\lbrack", "]", "\\rbrack",
        "\\{", "\\lbrace", "\\}", "\\rbrace",
        "\\lfloor", "\\rfloor", "\\lceil", "\\rceil",
        "<", ">", "\\langle", "\\rangle", "\\lt", "\\gt",
        "\\lvert", "\\rvert", "\\lVert", "\\rVert",
        "\\lgroup", "\\rgroup", "\\lmoustache", "\\rmoustache",
        "/", "\\backslash",
        "|", "\\vert", "\\|", "\\Vert",
        "\\uparrow", "\\Uparrow",
        "\\downarrow", "\\Downarrow",
        "\\updownarrow", "\\Updownarrow",
        ".",
    ];

    var fontAliases = {
        "\\Bbb": "\\mathbb",
        "\\bold": "\\mathbf",
        "\\frak": "\\mathfrak",
    };

    // Single-argument color functions
    defineFunction([
        "\\blue", "\\orange", "\\pink", "\\red",
        "\\green", "\\gray", "\\purple",
        "\\blueA", "\\blueB", "\\blueC", "\\blueD", "\\blueE",
        "\\tealA", "\\tealB", "\\tealC", "\\tealD", "\\tealE",
        "\\greenA", "\\greenB", "\\greenC", "\\greenD", "\\greenE",
        "\\goldA", "\\goldB", "\\goldC", "\\goldD", "\\goldE",
        "\\redA", "\\redB", "\\redC", "\\redD", "\\redE",
        "\\maroonA", "\\maroonB", "\\maroonC", "\\maroonD", "\\maroonE",
        "\\purpleA", "\\purpleB", "\\purpleC", "\\purpleD", "\\purpleE",
        "\\mintA", "\\mintB", "\\mintC",
        "\\grayA", "\\grayB", "\\grayC", "\\grayD", "\\grayE",
        "\\grayF", "\\grayG", "\\grayH", "\\grayI",
        "\\kaBlue", "\\kaGreen",
    ], {
        numArgs: 1,
        allowedInText: true,
        greediness: 3,
    }, function(context, args) {
        var body = args[0];
        var atoms;
        if (body.type === "ordgroup") {
            atoms = body.value;
        } else {
            atoms = [body];
        }

        return {
            type: "color",
            color: "katex-" + context.funcName.slice(1),
            value: atoms,
        };
    });

    // There are 2 flags for operators; whether they produce limits in
    // displaystyle, and whether they are symbols and should grow in
    // displaystyle. These four groups cover the four possible choices.

    // No limits, not symbols
    defineFunction([
        "\\arcsin", "\\arccos", "\\arctan", "\\arg", "\\cos", "\\cosh",
        "\\cot", "\\coth", "\\csc", "\\deg", "\\dim", "\\exp", "\\hom",
        "\\ker", "\\lg", "\\ln", "\\log", "\\sec", "\\sin", "\\sinh",
        "\\tan", "\\tanh",
    ], {
        numArgs: 0,
    }, function(context) {
        return {
            type: "op",
            limits: false,
            symbol: false,
            body: context.funcName,
        };
    });

    // Limits, not symbols
    defineFunction([
        "\\det", "\\gcd", "\\inf", "\\lim", "\\liminf", "\\limsup", "\\max",
        "\\min", "\\Pr", "\\sup",
    ], {
        numArgs: 0,
    }, function(context) {
        return {
            type: "op",
            limits: true,
            symbol: false,
            body: context.funcName,
        };
    });

    // No limits, symbols
    defineFunction([
        "\\int", "\\iint", "\\iiint", "\\oint",
    ], {
        numArgs: 0,
    }, function(context) {
        return {
            type: "op",
            limits: false,
            symbol: true,
            body: context.funcName,
        };
    });

    // Limits, symbols
    defineFunction([
        "\\coprod", "\\bigvee", "\\bigwedge", "\\biguplus", "\\bigcap",
        "\\bigcup", "\\intop", "\\prod", "\\sum", "\\bigotimes",
        "\\bigoplus", "\\bigodot", "\\bigsqcup", "\\smallint",
    ], {
        numArgs: 0,
    }, function(context) {
        return {
            type: "op",
            limits: true,
            symbol: true,
            body: context.funcName,
        };
    });

    // Fractions
    defineFunction([
        "\\dfrac", "\\frac", "\\tfrac",
        "\\dbinom", "\\binom", "\\tbinom",
    ], {
        numArgs: 2,
        greediness: 2,
    }, function(context, args) {
        var numer = args[0];
        var denom = args[1];
        var hasBarLine;
        var leftDelim = null;
        var rightDelim = null;
        var size = "auto";

        switch (context.funcName) {
            case "\\dfrac":
            case "\\frac":
            case "\\tfrac":
                hasBarLine = true;
                break;
            case "\\dbinom":
            case "\\binom":
            case "\\tbinom":
                hasBarLine = false;
                leftDelim = "(";
                rightDelim = ")";
                break;
            default:
                throw new Error("Unrecognized genfrac command");
        }

        switch (context.funcName) {
            case "\\dfrac":
            case "\\dbinom":
                size = "display";
                break;
            case "\\tfrac":
            case "\\tbinom":
                size = "text";
                break;
        }

        return {
            type: "genfrac",
            numer: numer,
            denom: denom,
            hasBarLine: hasBarLine,
            leftDelim: leftDelim,
            rightDelim: rightDelim,
            size: size,
        };
    });

    // Left and right overlap functions
    defineFunction(["\\llap", "\\rlap"], {
        numArgs: 1,
        allowedInText: true,
    }, function(context, args) {
        var body = args[0];
        return {
            type: context.funcName.slice(1),
            body: body,
        };
    });

    // Delimiter functions
    defineFunction([
        "\\bigl", "\\Bigl", "\\biggl", "\\Biggl",
        "\\bigr", "\\Bigr", "\\biggr", "\\Biggr",
        "\\bigm", "\\Bigm", "\\biggm", "\\Biggm",
        "\\big",  "\\Big",  "\\bigg",  "\\Bigg",
        "\\left", "\\right",
    ], {
        numArgs: 1,
    }, function(context, args) {
        var delim = args[0];
        if (!utils.contains(delimiters, delim.value)) {
            throw new ParseError(
                "Invalid delimiter: '" + delim.value + "' after '" +
                    context.funcName + "'",
                context.lexer, context.positions[1]);
        }

        // \left and \right are caught somewhere in Parser.js, which is
        // why this data doesn't match what is in buildHTML.
        if (context.funcName === "\\left" || context.funcName === "\\right") {
            return {
                type: "leftright",
                value: delim.value,
            };
        } else {
            return {
                type: "delimsizing",
                size: delimiterSizes[context.funcName].size,
                delimType: delimiterSizes[context.funcName].type,
                value: delim.value,
            };
        }
    });

    // Sizing functions (handled in Parser.js explicitly, hence no handler)
    defineFunction([
        "\\tiny", "\\scriptsize", "\\footnotesize", "\\small",
        "\\normalsize", "\\large", "\\Large", "\\LARGE", "\\huge", "\\Huge",
    ], 0, null);

    // Style changing functions (handled in Parser.js explicitly, hence no
    // handler)
    defineFunction([
        "\\displaystyle", "\\textstyle", "\\scriptstyle",
        "\\scriptscriptstyle",
    ], 0, null);

    defineFunction([
        // styles
        "\\mathrm", "\\mathit", "\\mathbf",

        // families
        "\\mathbb", "\\mathcal", "\\mathfrak", "\\mathscr", "\\mathsf",
        "\\mathtt",

        // aliases
        "\\Bbb", "\\bold", "\\frak",
    ], {
        numArgs: 1,
        greediness: 2,
    }, function(context, args) {
        var body = args[0];
        var func = context.funcName;
        if (func in fontAliases) {
            func = fontAliases[func];
        }
        return {
            type: "font",
            font: func.slice(1),
            body: body,
        };
    });

    // Accents
    defineFunction([
        "\\acute", "\\grave", "\\ddot", "\\tilde", "\\bar", "\\breve",
        "\\check", "\\hat", "\\vec", "\\dot",
        // We don't support expanding accents yet
        // "\\widetilde", "\\widehat"
    ], {
        numArgs: 1,
    }, function(context, args) {
        var base = args[0];
        return {
            type: "accent",
            accent: context.funcName,
            base: base,
        };
    });

    // Infix generalized fractions
    defineFunction(["\\over", "\\choose"], {
        numArgs: 0,
    }, function(context) {
        var replaceWith;
        switch (context.funcName) {
            case "\\over":
                replaceWith = "\\frac";
                break;
            case "\\choose":
                replaceWith = "\\binom";
                break;
            default:
                throw new Error("Unrecognized infix genfrac command");
        }
        return {
            type: "infix",
            replaceWith: replaceWith,
        };
    });

    // Row breaks for aligned data
    defineFunction(["\\\\", "\\cr"], {
        numArgs: 0,
        numOptionalArgs: 1,
        argTypes: ["size"],
    }, function(context, args) {
        var size = args[0];
        return {
            type: "cr",
            size: size,
        };
    });

    // Environment delimiters
    defineFunction(["\\begin", "\\end"], {
        numArgs: 1,
        argTypes: ["text"],
    }, function(context, args) {
        var nameGroup = args[0];
        if (nameGroup.type !== "ordgroup") {
            throw new ParseError(
                "Invalid environment name",
                context.lexer, context.positions[1]);
        }
        var name = "";
        for (var i = 0; i < nameGroup.value.length; ++i) {
            name += nameGroup.value[i].value;
        }
        return {
            type: "environment",
            name: name,
            namepos: context.positions[1],
        };
    });
});

