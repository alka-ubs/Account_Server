const {getProfile, checkSession, updatePreferences, updateProfile, updatePassword, deleteAccount, updateAvatar } = require("../controller/account.controller");
const authenticate = require("../middleware/authentication.middleware");
const { body, validationResult } = require('express-validator');
const upload = require("../middleware/multer");
const router = require("express").Router();



router.get("/profile", authenticate, getProfile);
router.get("/session", checkSession);
router.post("/update-preference", authenticate, updatePreferences);
router.put("/update-profile", authenticate, updateProfile);
router.put("/update-password", authenticate, updatePassword);
router.delete("/delete-account", authenticate, deleteAccount);
router.put("/update-avatar", authenticate, upload.single("avatar"), updateAvatar);



module.exports = router;