const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const utils = require("../../lib/utils");

//  Getters and Setters
const getTags = tags => tags.join(",");

const setTags = tags => tags.split(",");

// Tweet Schema
const TweetSchema = new Schema(
	{
		body: {type: String, default: "", trim: true, maxlength: 280},
		user: {type: Schema.ObjectId, ref: "User"},
		comments: [
			{
				body: {type: String, default: "", maxlength: 280},
				user: {type: Schema.ObjectId, ref: "User"},
				commenterName: {type: String, default: ""},
				commenterPicture: {type: String, default: ""},
				createdAt: {type: Date, default: Date.now}
			}
		],
		image: {type: String, default: ""},
		tags: {type: [], get: getTags, set: setTags},
		favorites: [{type: Schema.ObjectId, ref: "User"}],
		favoriters: [{type: Schema.ObjectId, ref: "User"}], // same as favorites
		favoritesCount: Number,
		createdAt: {type: Date, default: Date.now}
	},
	{usePushEach: true}
);

// Pre save hook
TweetSchema.pre("save", function (next) {
	if (this.favorites) {
		this.favoritesCount = this.favorites.length;
	}
	if (this.favorites) {
		this.favoriters = this.favorites;
	}
	next();
});

// Validations in the schema
TweetSchema.path("body").validate(
	body => body.length > 0,
	"Tweet body cannot be blank"
);

TweetSchema.virtual("_favorites").set(function (user) {
	if (this.favorites.indexOf(user._id) === -1) {
		this.favorites.push(user._id);
	} else {
		this.favorites.splice(this.favorites.indexOf(user._id), 1);
	}
});

TweetSchema.methods = {
	uploadAndSave: function (images, callback) {
		// const imager = new Imager(imagerConfig, "S3");
		const self = this;
		if (!images || !images.length) {
			return this.save(callback);
		}
		imager.upload(
			images,
			(err, cdnUri, files) => {
				if (err) {
					return callback(err);
				}
				if (files.length) {
					self.image = {cdnUri: cdnUri, files: files};
				}
				self.save(callback);
			},
			"article"
		);
	},
	addComment: function (user, comment, cb) {
		let commentData;
		if (user.name) {
			commentData = {
				body: comment,
				user: user._id,
				commenterName: user.name,
				commenterPicture: ''
			};
			this.comments.push(commentData);
		} else {
			commentData = {
				body: comment,
				user: user._id,
				commenterName: user.username,
				commenterPicture: ''
			};
			this.comments.push(commentData);
		}
		this.save(error => {
			cb(error, commentData);
		});
	},

	removeComment: function (commentId, cb) {
		let index = utils.indexof(this.comments, {id: commentId});
		if (~index) {
			this.comments.splice(index, 1);
		} else {
			return cb("not found");
		}
		this.save(cb);
	}


};

// ## Static Methods in the TweetSchema
TweetSchema.statics = {
	// Load tweets
	load: function (id, callback) {
		this.findOne({_id: id})
			.populate("user", "name username provider github")
			.populate("comments.user")
			.exec(callback);
	},
	// List tweets
	list: function (options) {
		const criteria = options.criteria || {};
		return this.find(criteria)
			.populate("user", "name username provider profileImage")
			.populate("comments.user")
			.sort({createdAt: -1})
			// .limit(options.perPage)
			// .skip(options.perPage * options.page);
	},
	// List tweets
	limitedList: function (options) {
		const criteria = options.criteria || {};
		return this.find(criteria)
			.populate("user", "name username")
			.sort({createdAt: -1})
			.limit(options.perPage)
			.skip(options.perPage * options.page);
	},
	// Tweets of User
	userTweets: function (id, callback) {
		this.find({user: ObjectId(id)})
			.toArray()
			.exec(callback);
	},

	// Count the number of tweets for a specific user
	countUserTweets: function (id, callback) {
		return this.find({user: id})
			.count()
			.exec(callback);
	},

	// Count the total app tweets
	countTotalTweets: function () {
		return this.find({}).count();
	}
};

mongoose.model("Tweet", TweetSchema);
