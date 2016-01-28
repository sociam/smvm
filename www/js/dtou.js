// jshint strict:false
// global angular, _, moment

// data terms of use spec for 1.0

// Core Predicates for Data Terms of Use, divided into categories
var DToUConstraints = {

	// temporal constraints describe when a particular item 
	// should be experienced.  we support absolute time intervals,
	// or recurring time intervals (e.g. every Thursday or "every day 
	// between 8am and 10am").
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
		betweenHourMins:function(ts,te) {
			// time start / end is like "07:00", formatted hh:mm
			return function() { 
				var nowm = moment(), sm = moment(ts,"hh:mm"),
					em = moment(te,"hh:mm");
				return em.isAfter(sm) && nowm.isBetween(sm,em);
			};
		},
		until:function(d) {
			return function() { 
				var nowm = moment(),
					sm = moment().hours(t1),
					em = moment().hours(t2);
				return em.isAfter(sm) && nowm.isBetween(sm,em);
			};
		}
	},
	// describes who the audience should be
	audience: {
		isPerson:function(personid) {
			return function(context) { return context.reader.id === personid; };
		},
		minAge:function(yrs) {
			return function(context) { return contxt.reader.age >= yrs; }; 
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

/// example declaration
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
		DToUConstraints.audience.isPerson('http://hip.cat/emax')
	],

	// this dtou declaration itself needs to be signed by the author
	// to certify it is untampered.
	signature:'' // this dtou signed and certified by the author
};
