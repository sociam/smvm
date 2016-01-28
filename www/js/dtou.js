

// data terms of use spec for 1.0

var DToUConstraints = {
	temporal: {
		interval:function(s,e) {
			var sm = moment(s), em = moment(e);
			return function() {
				var nowm = moment();
				return em.isAfter(sm) && nowm.isBetween(sm,em);
			};
		},
		dayofWeek:function(day) {
			// day is an integer : 0..6 (todo change to strings)
			return function() { 
				var nowm = new Date();
				return nowm.getDay() == day;
			};
		},
	},
	audience: {
		isPerson:function(personid) {
			return function(context) { return context.reader.id === personid; };
		}
	},
	presentational: {
		isApp:function(appid) {
			return function(context) { return context.app.id == appid; };
		},
		isApp:function(appid) {
			return function(context) { return context.app.id == appid;	};
		},
		minScreenWidth:function(px) {
			return function(context) { return context.screen.width >= px; };
		},
	}
}

var example = {
	// describes the item annotated
	author:'http://hip.cat/emax#id',

	// describes the item being annotated
	src:'http://hip.cat/emax/microblogs/blahblah1', // optional
	srcHash:'18277823872k2323b', // optional

	constraints: [
		// put a constraint on it for showing only during feb
		DToUConstraints.interval(moment('2016-02-01'), moment('2016-02-28')),
		// put an authorial constraints on it
		DToUConstraints.audience('http://hip.cat/emax')
	],

	// this dtou declaration itself needs to be signed by the author
	// to certify it is untampered.
	signature:'' // this dtou signed and certified by the author
};
