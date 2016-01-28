/* global _,  */
// jshint strict:false

// Core Predicates for Data Terms of Use, divided into categories
var MicroblogController = function() { 
	this._db = {};
};

MicroblogController.prototype = {
	add:function(item) { 
		if (item._dtou !== undefined) { this._db[item.id] = item; }
	},
	getHot:function(context) { 
		return Promise.filter(_(this._db).values(), function(item) { 
			return Promise.reduce(
				item._dtou.constraints,
				function(constraint, rest) { 
					var checked = constraint(context);
					return checked.then(function(check_result) { return rest && check_result; }).catch(function() { return false; });
				},
				true
			);
		});
	}
	// todo reap expired ones
};

