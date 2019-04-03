
const mongoose = require("mongoose");
const Tweet = mongoose.model("Tweet");

// ### Create Favorite
exports.create = (req, res) => {
	const tweet_id = req.body.tweet;
	Tweet.findById(tweet_id, (error, tweet) => {
		tweet.favorites.push(req.user);
		tweet.save(err => {
			if (err) {
				return res.status(400).json({error: "Server Error"});
			}
			res.send(201, {});
		});
	})
};

// ### Delete Favorite
exports.destroy = (req, res) => {
	const tweet_id = req.body.tweet;
	Tweet.findById(tweet_id, (error, tweet) => {
		console.log(tweet);
		let index = tweet.favorites.indexOf(req.user._id);
		if (index>=0) {
			tweet.favorites.splice(index,1);
			tweet.save(err => {
				if (err) {
					return res.status(400).json({error: "Server Error"});
				}
				res.send(201, {});
			});
		} else {
			res.send(201, {});
		}
	});
};
