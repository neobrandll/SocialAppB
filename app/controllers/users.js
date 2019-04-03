const Mongoose = require("mongoose");
const Tweet = Mongoose.model("Tweet");
const User = Mongoose.model("User");
const Analytics = Mongoose.model("Analytics");
const logger = require("../middlewares/logger");
const randtoken = require('rand-token');

exports.signin = (req, res) => {
};

exports.authCallback = (req, res) => {
	res.redirect("/");
};

const validatePresenceOf = value => value && value.length;

exports.getList = async (req, res) => {
	console.log(req.body);
	let users = [];
	for (let x in req.body.ids) {
		let user = await User.findById(req.body.ids[x]).exec();
		users.push(user);
	}
	res.status(200).json({users});
};

exports.search = (req, res) => {
	if (!validatePresenceOf(req.body.search)) {
		return res.status(400).json({error: "Invalid Input"})
	}
	User.find({
		$or: [
			{
				name: new RegExp(req.body.search, 'ig')
			},
			{
				username: new RegExp(req.body.search, 'ig')
			}
		]
	}, (err, users) => {
		res.status(200).json(users)
	});
};

exports.update = (req, res) => {
	User.findOne({
		_id: req.user._id
	}, (err, user) => {
		user.name = req.body.name;
		user.email = req.body.email;
		user.username = req.body.username;
		user.save(err => {
			if (err)
				res.status(400).json({error: err});
			else
				res.status(200).json({user: user});
		});
	})
};

exports.login = (req, res) => {
	if (!validatePresenceOf(req.body.email) || !validatePresenceOf(req.body.password)) {
		return res.status(400).json({error: "Invalid Input"})
	}
	let token = randtoken.uid(64);
	User.findOne({email: req.body.email}, (error, user) => {
		if (user) {
			console.log(user);
			if (user.authenticate(req.body.password)) {
				user.token = token;
				user.save(error => {
					console.log(error);
					console.log("User: ", user);
					res.status(200).json({user});
				})
			} else {
				res.status(400).json({error: "Invalid Password"});
			}
		} else {
			res.status(404).json({error: "User not found"})
		}
	})
}

exports.home = (req, res) => {
	let tweetCount, userCount, analyticsCount;
	let options = {};
	Analytics.list(options)
		.then(() => {
			return Analytics.count();
		})
		.then(result => {
			analyticsCount = result;
			return Tweet.countTotalTweets();
		})
		.then(result => {
			tweetCount = result;
			return User.countTotalUsers();
		})
		.then(result => {
			userCount = result;
			logger.info(tweetCount);
			logger.info(userCount);
			logger.info(tweetCount);
			res.render("pages/login", {
				title: "Login",
				message: req.flash("error"),
				userCount: userCount,
				tweetCount: tweetCount,
				analyticsCount: analyticsCount
			});
		});
};

exports.signup = (req, res) => {
	console.log(req.body);
	let user = new User(req.body);
	user.save((error, f) => {
		if (error) {
			console.log(error);
			res.status(400).json({error})
		} else
			res.status(200).json({user})
	});
};

exports.logout = (req, res) => {
	req.logout();
	res.status(200).json({message: 'logout complete'})
};

exports.session = (req, res) => {
	res.redirect("/");
};

exports.create = (req, res, next) => {
	const user = new User(req.body);
	user.provider = "local";
	user
		.save()
		.catch(error => {
			return res.render("pages/login", {errors: error.errors, user: user});
		})
		.then(() => {
			return req.login(user);
		})
		.then(() => {
			return res.redirect("/");
		})
		.catch(error => {
			return next(error);
		});
};

exports.list = (req, res) => {
	const page = (req.query.page > 0 ? req.query.page : 1) - 1;
	const perPage = 5;
	const options = {
		perPage: perPage,
		page: page,
		criteria: {github: {$exists: true}}
	};
	let users, count;
	User.list(options)
		.then(result => {
			users = result;
			return User.count();
		})
		.then(result => {
			count = result;
			res.render("pages/user-list", {
				title: "List of Users",
				users: users,
				page: page + 1,
				pages: Math.ceil(count / perPage)
			});
		})
		.catch(error => {
			return res.render("pages/500", {errors: error.errors});
		});
};

exports.show = (req, res) => {
	const user = req.profile;
	const reqUserId = user._id;
	const userId = reqUserId.toString();
	const page = (req.query.page > 0 ? req.query.page : 1) - 1;
	const options = {
		perPage: 100,
		page: page,
		criteria: {user: userId}
	};
	let tweets, tweetCount;
	let followingCount = user.following.length;
	let followerCount = user.followers.length;

	Tweet.list(options)
		.then(result => {
			tweets = result;
			return Tweet.countUserTweets(reqUserId);
		})
		.then(result => {
			tweetCount = result;
			res.json({
				user: user,
				tweets: tweets,
				tweetCount: tweetCount,
				followerCount: followerCount,
				followingCount: followingCount
			});
		})
		.catch(error => {
			return res.json({errors: error.errors});
		});
};

exports.user = (req, res, next, id) => {
	User.findOne({_id: id}).exec((err, user) => {
		if (err) {
			return next(err);
		}
		if (!user) {
			return next(new Error("failed to load user " + id));
		}
		req.profile = user;
		next();
	});
};

exports.setPhoto = (req, res) => {
	const user = req.user;
	if (req.files) {
		const image = req.files.image;
		const basePath = __dirname+"/../../public/";
		const filePath = "img/uploads/profile/"+new Date().getTime()+"-"+image.name;
		user.profileImage = filePath;
		image.mv(basePath+filePath, error => {
			if (!error) {
				user.save(err => {
					if (err) {
						res.status(500).json({error: err});
					} else {
						res.status(200).json({user});
					}
				});
			} else {
				res.status(500).json({error: err});
			}
		})
	} else {
		res.status(400).json({error: "No Photo sent."});
	}
};

exports.showFollowers = (req, res) => {
	showFollowers(req, res, "followers");
};

exports.showFollowing = (req, res) => {
	showFollowers(req, res, "following");
};

exports.delete = (req, res) => {
	Tweet.remove({user: req.user._id})
		.then(() => {
			User.findByIdAndRemove(req.user._id)
				.then(() => {
					return res.redirect("/login");
				})
				.catch(() => {
					res.render("pages/500");
				});
		})
		.catch(() => {
			res.render("pages/500");
		});
};

function showFollowers(req, res, type) {
	let user = req.profile;
	let followers = user[type];
	let tweetCount;
	let followingCount = user.following.length;
	let followerCount = user.followers.length;
	let userFollowers = User.find({_id: {$in: followers}}).populate(
		"user",
		"_id name username github"
	);

	Tweet.countUserTweets(user._id).then(result => {
		tweetCount = result;
		userFollowers.exec((err, users) => {
			if (err) {
				return res.render("pages/500");
			}
			// res.render("pages/followers", {
				// user: user,
				// followers: users,
				// tweetCount: tweetCount,
				// followerCount: followerCount,
				// followingCount: followingCount
			// });
			res.status(200).json({	user: user,
				followers: users,
				tweetCount: tweetCount,
				followerCount: followerCount,
				followingCount: followingCount})
		});
	});
}
