/*
The MIT License (MIT)

Copyright (c) 2015 Khan Academy

This software also uses portions of the underscore.js project, which is
MIT licensed with the following copyright:

Copyright (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative
Reporters & Editors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

define(["exports", "katex_ParseError", "katex_Settings", "katex_buildTree", "katex_parseTree", "katex_utils"], function(exports, ParseError, Settings, buildTree, parseTree, utils) {
    var render = function(expression, baseNode, options) {
        utils.clearNode(baseNode);

        var settings = new Settings.Settings(options);

        var tree = parseTree.parseTree(expression, settings);
        var node = buildTree.buildTree(tree, expression, settings).toNode();

        baseNode.appendChild(node);
    };

    if (typeof document !== "undefined") {
        if (document.compatMode !== "CSS1Compat") {
            typeof console !== "undefined" && console.warn(
                "Warning: KaTeX doesn't work in quirks mode. Make sure your " +
                    "website has a suitable doctype.");

            render = function() {
                throw new ParseError("KaTeX doesn't work in quirks mode.");
            };
        }
    }

    var renderToString = function(expression, options) {
        var settings = new Settings.Settings(options);

        var tree = parseTree.parseTree(expression, settings);
        return buildTree.buildTree(tree, expression, settings).toMarkup();
    };

    var generateParseTree = function(expression, options) {
        var settings = new Settings.Settings(options);
        return parseTree.parseTree(expression, settings);
    };

    exports.render = render;
    exports.renderToString = renderToString;
    exports.__parse = generateParseTree;
    exports.ParseError = ParseError;
});
