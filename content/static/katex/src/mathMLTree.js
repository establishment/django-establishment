define(["exports", "katex_utils"], function(exports, utils) {
    function MathNode(type, children) {
        this.type = type;
        this.attributes = {};
        this.children = children || [];
    }

    MathNode.prototype.setAttribute = function(name, value) {
        this.attributes[name] = value;
    };

    MathNode.prototype.toNode = function() {
        var node = document.createElementNS(
            "http://www.w3.org/1998/Math/MathML", this.type);

        for (var attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                node.setAttribute(attr, this.attributes[attr]);
            }
        }

        for (var i = 0; i < this.children.length; i++) {
            node.appendChild(this.children[i].toNode());
        }

        return node;
    };

    MathNode.prototype.toMarkup = function() {
        var markup = "<" + this.type;

        // Add the attributes
        for (var attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                markup += " " + attr + "=\"";
                markup += utils.escape(this.attributes[attr]);
                markup += "\"";
            }
        }

        markup += ">";

        for (var i = 0; i < this.children.length; i++) {
            markup += this.children[i].toMarkup();
        }

        markup += "</" + this.type + ">";

        return markup;
    };

    function TextNode(text) {
        this.text = text;
    }


    TextNode.prototype.toNode = function() {
        return document.createTextNode(this.text);
    };


    TextNode.prototype.toMarkup = function() {
        return utils.escape(this.text);
    };

    exports.MathNode = MathNode;
    exports.TextNode = TextNode;
});
