const express = require("express");
const router = express.Router();
const log = require("./middlewares/logger");

const users = require("../app/controllers/users");
const apiv1 = require("../app/controllers/apiv1");
const chat = require("../app/controllers/chat");
const analytics = require("../app/controllers/analytics");
const tweets = require("../app/controllers/tweets");
const comments = require("../app/controllers/comments");
const favorites = require("../app/controllers/favorites");
const follows = require("../app/controllers/follows");
const activity = require("../app/controllers/activity");

module.exports = (app, passport, auth) => {
	app.use("/", router);
	/**
	 * Main unauthenticated routes
	 */
	router.get("/home", users.home);
	router.post("/login", users.login)
	router.post("/signup", users.signup);
	router.get("/logout", users.logout);

	/**
	 * Authentication routes
	 */
	router.get(
		"/auth/github",
		passport.authenticate("github", {failureRedirect: "/home"}),
		users.signin
	);
	router.get(
		"/auth/github/callback",
		passport.authenticate("github", {failureRedirect: "/home"}),
		users.authCallback
	);

	/**
	 * API routes
	 */
	router.get("/apiv1/tweets", apiv1.tweetList);
	router.get("/apiv1/users", apiv1.usersList);


	router.use(passport.authenticate('bearer', {session: false}));

	/**
	 * Authentication middleware
	 * All routes specified after this middleware require authentication in order
	 * to access
	 */
	router.use(auth.requiresLogin);
	/**
	 * Analytics logging middleware
	 * Anytime an authorized user makes a get request, it will be logged into
	 * analytics
	 */
	router.get("/*", log.analytics);

	/**
	 * Acivity routes
	 */
	router.get("/activities", activity.index); ///
	/**
	 * Home route
	 */
	router.get("/", tweets.index); ///


	/**
	 * User routes
	 */
	router.put("/users", users.update)
	router.post("/users/get", users.getList)
	router.get("/users/:userId", users.show);
	router.get("/users/:userId/followers", users.showFollowers);
	router.get("/users/:userId/following", users.showFollowing);
	router.post("/users/search", users.search);
	// router.post("/users", users.create);
	// router.post(
	//     "/users/sessions",
	//     passport.authenticate("local", {
	//         failureRedirect: "/home",
	//         failureFlash: "Invalid email or password"
	//     }),
	//     users.session
	// );
	router.post("/users/:userId/follow", follows.follow);
	router.delete("/users/:userId/follow", follows.unfollow);
	router.post("/users/:userId/delete", users.delete);
	router.param("userId", users.user);

	router.post("/users/photo", users.setPhoto);

	/**
	 * Chat routes
	 */
	router.param("idChat", chat.chat);
	router.get("/chats", chat.index);
	router.get("/chat/:idChat", chat.show);
	router.get("/chat/get/:userId", chat.getChat);
	router.post("/message/:userId", chat.create);
	/**
	 * Analytics routes
	 */
	router.get("/analytics", analytics.index);

	/**
	 * Tweet routes
	 */
	router
		.route("/tweets")
		.get(tweets.index)
		.post(tweets.create); ///

	router
		.route("/tweets/:id")
		.post(auth.tweet.hasAuthorization, tweets.update)
		.delete(tweets.destroy);

	router.param("id", tweets.tweet);

	/**
	 * Comment routes
	 */

	router.param("id_comment", comments.comment);
	router
		.route("/tweets/:id/comments")
		.post(comments.create)
	router
		.route("/tweets/:id/comment/:id_comment")
		.delete(comments.destroy);

	/**
	 * Favorite routes
	 */
	router
		.route("/tweets/:id/favorites")
		.post(favorites.create);

	router
		.route("/tweets/:id/favorites/unlike")
		.post(favorites.destroy);

	/**
	 * Page not found route (must be at the end of all routes)
	 */
	router.use((req, res) => {
		res.status(404).render("pages/404", {
			url: req.originalUrl,
			error: "Not found"
		});
	});
};
