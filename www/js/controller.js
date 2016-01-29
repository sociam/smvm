/* global _  */
// jshint strict:false

/* 
	The MicroblogController is the repository where all the
	microposts are "stored" (not yet persisted).

	This as a stand-in for a PDS. 

*/	

// Core Predicates for Data Terms of Use, divided into categories
var MicroblogController = function() { 
	this._db = {};
};

MicroblogController.prototype = {
	add:function(item) { 
		if (item._dtou !== undefined) { this._db[item.id] = item; }
	},
	check_constraint : function(constraint) {
		var checker_fam = DToUConstraints[ constraint.family ];
			checker_fn = checker_fam && checker_fam[ constraint.type ];
		return checker_fn && checker_fn(constraint);
	},
	getHot:function(context) { 
		return Promise.filter(_(this._db).values(), function(item) { 
			return Promise.reduce(
				item._dtou.constraints,
				function(constraint, rest) { 
					var checked = this_.check_constraint(context);
					return checked.then(function(check_result) { return rest && check_result; }).catch(function() { return false; });
				},
				true
			);
		});
	}
	// todo reap expired ones
};

