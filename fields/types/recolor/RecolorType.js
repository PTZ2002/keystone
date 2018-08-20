var FieldType = require('../Type');
var TextType = require('../text/TextType');
var util = require('util');


/**
 * Color FieldType Constructor
 * @extends Field
 * @api public
 */
function recolor (list, path, options) {
	this._nativeType = String;
	color.super_.call(this, list, path, options);
}
recolor.properName = 'Recolor';
util.inherits(color, FieldType);

recolor.prototype.validateInput = TextType.prototype.validateInput;
recolor.prototype.validateRequiredInput = TextType.prototype.validateRequiredInput;

/* Inherit from TextType prototype */
recolor.prototype.addFilterToQuery = TextType.prototype.addFilterToQuery;

/* Export Field Type */
module.exports = recolor;
