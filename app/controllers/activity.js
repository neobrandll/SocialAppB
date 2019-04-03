const mongoose = require("mongoose");
const Activity = mongoose.model("Activity");

exports.index = (req, res) => {
    let activities;
    let options = {};
    Activity.list(options).then(result => {
        res.json(result);
    });
};
