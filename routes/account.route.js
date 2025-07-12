const {getProfile, checkSession, updatePreferences, updateProfile, updatePassword, deleteAccount } = require("../controller/account.controller");
const authenticate = require("../middleware/authentication.middleware");
const { body, validationResult } = require('express-validator');
const router = require("express").Router();



router.get("/profile", authenticate, getProfile);
router.get("/session", checkSession);
router.post("/update-preference", authenticate, updatePreferences);
router.put("/update-profile", authenticate, updateProfile);
router.put("/update-password", authenticate, updatePassword);
router.delete("/delete-account", authenticate, deleteAccount)


module.exports = router;