var async = require('async');
var FieldType = require('../Type');
var util = require('util');
var utils = require('keystone-utils');

var isReserved = require('../../../lib/list/isReserved');

/**
 * List FieldType Constructor
 * @extends Field
 * @api public
 */
function list (keystoneList, path, options) {
	this._underscoreMethods = ['format'];
	list.super_.call(this, keystoneList, path, options);
}
list.properName = 'List';
util.inherits(list, FieldType);


/* Export Field Type */
module.exports = list;