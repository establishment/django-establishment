/**
 * Provides a single function for parsing an expression using a Parser
 * TODO(emily): Remove this
 */


/**
 * Parses an expression using a Parser, then returns the parsed result.
 */
define(["exports", "katex_Parser"], function(exports, Parser) {

    var parseTree = function(toParse, settings) {
        var parser = new Parser.Parser(toParse, settings);

        return parser.parse();
    };

    exports.parseTree = parseTree;

});
