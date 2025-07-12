const createUser = async (req, res) => {
};
const loginUser = async (req, res) => {
};

const logoutUser = async  (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed");
    res.clearCookie('connect.sid');
    res.send({ success: true });
    
  });
}

module.exports = {
  createUser,         
  loginUser,         
  logoutUser,            
};