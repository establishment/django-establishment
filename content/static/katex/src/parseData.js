/**
 * The resulting parse tree nodes of the parse tree.
 */
define(["exports"], function(exports) {
    function ParseNode(type, value, mode) {
        this.type = type;
        this.value = value;
        this.mode = mode;
    }
    exports.ParseNode  = ParseNode;
});

