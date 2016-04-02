/* global _, moment */
// jshint strict:false

// data terms of use spec for 1.0

// Core Predicates for Data Terms of Use, divided into categories
var DToUConstraints = {

	// temporal constraints describe when a particular item
	// should be experienced.  we support absolute time intervals,
	// or recurring time intervals (e.g. every Thursday or "every day
	// between 8am and 10am").
	temporal: {
		interval:function(params) {
			var sm = moment(params.start), em = moment(params.end);
			return function() {
				var nowm = moment();
				return em.isAfter(sm) && nowm.isBetween(sm,em);
			};
		},
		dayofWeek:function(params) {
			// day is an integer : 0..6 (todo change to strings)
			return function() {
				var nowm = new Date();
				return nowm.getDay() === params.day;
			};
		},
		betweenHourMins:function(params) {
			// time start / end is like "07:00", formatted hh:mm
			return function() {
				var nowm = moment(),
					sm = moment(params.start,"hh:mm"),
					em = moment(params.end,"hh:mm");
				return em.isAfter(sm) && nowm.isBetween(sm,em);
			};
		},
		until:function(params) {
			var dm = moment(d);
			return function() {
				var nowm = moment();
				return nowm.isBefore(hamish.date);
			};
		}
	},
	// describes who the audience should be
	recipient: {
		person:function(personid) {
			return function(context) { return context.reader.id === personid; };
		},
		minAge:function(yrs) {
			return function(context) { return context.reader.age >= yrs; };
		}
	},
	location: {
		nearLatLng:function(lat,lng) {
			/* todo */
			return function(context) {};
		}
	},
	presentational: {
		isApp:function(params) {
			return function(context) { return context.app.id == params.appid; };
		},
		isAppVersion:function(appid) {
			return function(context) { return context.app.id == params.appid && context.app.version == params.appversion; };
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
	src_signature:'18277823872k2323b', // optional

	useConstraints: [
		// put a constraint on it for showing only during feb
		{ family:'temporal', type:'interval',from:'2016-02-01', to: '2016-02-28' },
		{ family:'recipient', type:'person', person:'http://hip.cat/emax'	},
		{ family:'location', type: 'nearLatLng', lat: 51.7721340, lng: -1.2105430 },
		{ family:'nUses', type: 'max', val:5  }
	],

	// stripped of personally identfying info (pii)
	// what does the user think about?
	useTracking: [
		{ type:'log', useType:'view' },
		{ type:'pingback-notification', useType:'resharing', notifytarget:'http://hip.cat/emax#id' },
		{ type:'action-notification', useType:'favourite', notifytarget:'http://hip.cat/emax#id' }
	],

	license: [],

	storage: {
		retention: 'indefinite', // until
		container: {
			access:	[{value: 'open', strength:'optional'}],
			owner:{
				combination:'or',
				values:[
					{ type:'person', value:'http://hip.cat/emax' },
					{ type:'org', value:'http://sociam.org/' }
				]
			},
			location: { type:'containedin', value:'geopoliticalboundaries.com/EU'},
		},
		replication : { min_copies:2 }
	},

	// this dtou declaration itself needs to be signed by the author
	// to certify it is untampered.
	signature:'' // this dtou signed and certified by the author
};
