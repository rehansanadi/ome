const express = require("express");
const route = express.Router();
const services = require("../services/render");
const controller = require("../controller/controller");

route.get("/", services.homeRoutes);

route.get("/video_chat", services.video_chat);
route.get("/text_chat", services.text_chat);
route.post("/api/users", controller.create);
route.put("/leaving-user-update/:id", controller.leavingUserUpdate);
route.put("/new-user-update/:id", controller.newUserUpdate);
route.post("/get-remote-users", controller.remoteUserFind);

module.exports = route;
