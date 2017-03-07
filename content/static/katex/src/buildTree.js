define(["exports", "katex_buildHTML", "katex_buildMathML", "katex_buildCommon", "katex_Options", "katex_Settings", "katex_Style"], function(exports, buildHTML, buildMathML, buildCommon, Options, Settings, Style) {
    var makeSpan = buildCommon.makeSpan;

    var buildTree = function(tree, expression, settings) {
        settings = settings || new Settings.Settings({});

        var startStyle = Style.TEXT;
        if (settings.displayMode) {
            startStyle = Style.DISPLAY;
        }

        // Setup the default options
        var options = new Options.Options({
            style: startStyle,
            size: "size5",
        });

        // `buildHTML` sometimes messes with the parse tree (like turning bins ->
        // ords), so we build the MathML version first.
        var mathMLNode = buildMathML.buildMathML(tree, expression, options);
        var htmlNode = buildHTML.buildHTML(tree, options);

        var katexNode = makeSpan(["katex"], [
            mathMLNode, htmlNode,
        ]);

        if (settings.displayMode) {
            return makeSpan(["katex-display"], [katexNode]);
        } else {
            return katexNode;
        }
    };

    exports.buildTree = buildTree;
});

