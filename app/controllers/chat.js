const createPagination = require("./analytics").createPagination;
const mongoose = require("mongoose");
const Activity = mongoose.model("Activity");
const Chat = mongoose.model("Chat");
const User = mongoose.model("User");
const logger = require("../middlewares/logger");

exports.chat = (req, res, next, id) => {
	Chat.findById(id, (err, chat) => {
		if (err) {
			return next(err);
		}
		if (!chat) {
			return next(new Error("Failed to load chat: " + id));
		}
		req.chat = chat;
		next();
	});
};

exports.index = (req, res) => {
	// so basically this is going to be a list of all chats the user had till date.
	Chat.find({
		$or: [{user1: req.user._id}, {user2: req.user._id}]
	}, (err, chats) => {
		let index = 0;
		chats.forEach(chat => {
			["user1", "user2"].forEach(x => {
				if (chat[x].toString() != req.user._id.toString()) {
					User.findById(chat[x], (err, user) => {
						chat.user1 = user;
						index++;
						if (index == chats.length) {
							res.status(200).json({chats});
						}
					})
				}
			})
		});
		if (!chats.length) {
			res.status(200).json({chats:[]});
		}
	});
};

exports.show = (req, res) => {
	res.status(200).json({chat: req.chat});
};

exports.getChat = (req, res) => {
	Chat.findOne({
		$or: [
			{user1: req.user._id, user2: req.profile._id},
			{user1: req.profile._id, user2: req.user._id}
		]
	}, (err, chat) => {
		if (err) {
			res.status(500).json({error: err});
		} else {
			res.status(201).json({chat})
		}
	})
	// const options = {
	// 	criteria: {receiver: req.params.userid}
	// };
	// let chats;
	// chat.List(options).then(result => {
	// 	chats = result;
	// 	res.status(200).json({chat: chats});
	// 	//res.render("chat/chat", {chats: chats});
	// });
};

exports.create = (req, res) => {
	if (req.user._id == req.profile._id) {
		return res.status(400).json({error: "You can't send a message to yourself"});
	}
	Chat.findOne({
		$or: [
			{user1: req.user._id, user2: req.profile._id},
			{user1: req.profile._id, user2: req.user._id}
		]
	}, (err, chat) => {
		if (!chat) {
			// Create One
			chat = new Chat({
				user1: req.user._id,
				user2: req.profile._id
			});
		}
		let type, message;
		const cb = () => {
			chat.addMessage(req.user._id, type, message);
			chat.save(err => {
				if (err) {
					res.status(500).json({error: err});
				} else {
					res.status(201).json({chat})
				}
			});
		}
		if (req.files) {
			type = "image"
			const image = req.files.message;
			const basePath = __dirname + "/../../public/";
			const filePath = "img/uploads/messages/" + new Date().getTime() + "-" + image.name;
			image.mv(basePath + filePath, error => {
				if (!error) {
					cb();
				} else {
					res.status(500).json({error: err});
				}
			})
			message = filePath;
		} else {
			type = "message"
			message = req.body.message;
			cb();
		}
	});


	// logger.info("chat instance", chat);
	// chat.save(err => {
	// 	const activity = new Activity({
	// 		activityStream: "sent a message to",
	// 		activityKey: chat.id,
	// 		receiver: req.body.receiver,
	// 		sender: req.user.id
	// 	});
	// 	activity.save(err => {
	// 		if (err) {
	// 			logger.error(err);
	// 			res.render("pages/500");
	// 		}
	// 	});
	// 	logger.error(err);
	// 	if (!err) {
	// 		res.redirect(req.header("Referrer"));
	// 	}
	// });
};
