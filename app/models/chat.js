const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatSchema = new Schema(
	{
		messages: [
			{
				type: {type: String},
				message: {type: String, default: "", trim: true},
				sentBy: {type: Schema.ObjectId, ref: "User"},
				sentAt: {type: Date, default: Date.now}
			}
		],
		user1: {type: Schema.ObjectId, ref: "User"},
		user2: {type: Schema.ObjectId, ref: "User"},
		createdAt: {type: Date, default: Date.now}
	},
	{usePushEach: true}
);


ChatSchema.methods = {

	addMessage: function (user, type, message) {
		this.messages.push({
			type: type,
			message: message,
			sentBy: user
		});
	},
	load: function (options, cb) {
		options.select = options.select || "message sender receiver createdAt";
		return this.findOne(options.criteria)
			.select(options.select)
			.exec(cb);
	},
	List: function (options) {
		const criteria = options.criteria || {};
		return this.find(criteria)
			.populate("sender", "name username github")
			.populate("receiver", "name username github")
			.sort({createdAt: -1})
			.limit(options.perPage)
			.skip(options.perPage * options.page);
	}
};

mongoose.model("Chat", ChatSchema);
