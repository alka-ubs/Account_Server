const { createUser, loginUser, logoutUser } = require("../controller/user.controller");
const authenticate = require("../middleware/authentication.middleware");
const { body, validationResult } = require('express-validator');
const router = require("express").Router();



  

router.post("/register",  createUser);
router.post("/login",  loginUser);
router.post("/logout", authenticate,logoutUser);


module.exports = router;