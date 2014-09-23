(function(module) {
	"use strict";

	var user = module.parent.require('./user'),
		meta = module.parent.require('./meta'),
		db = module.parent.require('../src/database'),
		passport = module.parent.require('passport'),
		passportSAML = require('passport-saml').Strategy,
		fs = module.parent.require('fs'),
		path = module.parent.require('path'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async');

	var constants = Object.freeze({
		'name': "SAML",
		'admin': {
			'route': '/plugins/sso-saml',
			'icon': 'fa-university'
		}
	});

	var SAML = {};
	var samlObj;

	if (meta.config['sso:saml:idpentrypoint'] && meta.config['sso:saml:callbackpath']&& meta.config["sso:saml:metadata"] && meta.config["sso:saml:issuer"]) {
	
		samlObj = new passportSAML({
			    path: meta.config['sso:saml:callbackpath'],
			    entryPoint: meta.config['sso:saml:idpentrypoint'],
			    issuer: 'passport-saml',
			    callbackUrl: nconf.get('url') + meta.config['sso:saml:callbackpath']
		  	},
		  	function(profile, done) {
		  		
		    	var user = {
			        nameID: profile.nameID,
			        nameIDFormat: profile.nameIDFormat,
			        sn: profile.sn,
			        cn: profile.cn,
			        mail: profile.mail,
			        eduPersonAffiliation: profile.eduPersonAffiliation,
			        email: profile.email,
			        username: profile.displayName
			    };

			    SAML.login(user.nameID,user.username,function(err, user) {
					if (err) {
						return done(err);
					}
					done(null, user);
				});
		  	}
		);
	}
	else{
		console.log("No config info")
		console.log(meta.config);
	}


	SAML.init = function(app, middleware, controllers, callback) {
		function render(req, res, next) {
			res.render('admin/plugins/sso-saml', {});
		}

		app.get('/admin/plugins/sso-saml', middleware.admin.buildHeader, render);
		app.get('/api/admin/plugins/sso-saml', render);

		if (samlObj){

			if (meta.config["sso:saml:metadata"]) {
				app.get(meta.config["sso:saml:metadata"], function(req, res) {
					if (meta.config["sso:saml:servercrt"]){
					 	var cert = fs.readFileSync(meta.config["sso:saml:servercrt"], 'utf-8');
					  	res.header("Content-Type", "application/xml");
					  	res.send(samlObj.generateServiceProviderMetadata(cert))	
					}
					else{
						res.send("No servercrt specified. Please enter it at nodebb admin panel.");
					}
				});	
			}
			

			app.post(meta.config['sso:saml:callbackpath'],
				passport.authenticate('saml', { successRedirect: '/',failureRedirect: '/', failureFlash: true })
			);
		}
	
		callback();
	};

	SAML.getStrategy = function(strategies, callback) {

		if (samlObj){
		
			passport.use(samlObj);

			strategies.push({
				name: 'saml',
				url: '/auth/saml',
				callbackURL: meta.config['sso:saml:callbackpath'],
				icon: constants.admin.icon,
				scope: ''
			});
		}

		callback(null, strategies);
	};

	SAML.login = function(samlid,username, callback) {

		SAML.getUidBySAMLId(samlid, function(err, uid) {
			if(err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
				 	uid: uid
				});
			}
			else {
				// New User
				user.create({username: username}, function(err, uid) {
					if(err) {
						return callback(err);
					}
					// Save twitter-specific information to the user
					user.setUserField(uid, 'samlid', samlid);
					db.setObjectField('samlid:uid', samlid, uid);

					callback(null, {
						uid: uid
					});
				});
			}
		});
	};

	SAML.getUidBySAMLId = function(samlid, callback) {
		db.getObjectField('samlid:uid', samlid, function(err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	SAML.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};

	SAML.deleteUserData = function(uid, callback) {
		async.waterfall([
			async.apply(user.getUserField, uid, 'samlid'),
			function(idToDelete, next) {
				db.deleteObjectField('samlid:uid', idToDelete, next);
			}
		], function(err) {
			if (err) {
				winston.error('[sso-saml] Could not remove user data for uid ' + uid + '. Error: ' + err);
				return callback(err);
			}
			callback(null, uid);
		});
	};

	module.exports = SAML;
}(module));
