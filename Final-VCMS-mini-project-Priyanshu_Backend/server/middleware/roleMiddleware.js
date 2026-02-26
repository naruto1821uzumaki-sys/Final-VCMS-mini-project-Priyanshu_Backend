// Middleware factory: pass allowed roles and it returns middleware
const permitRoles = (...allowedRoles) => {
	return (req, res, next) => {
		try {
			if (!req.user) return res.status(401).json({ message: "Unauthorized" });

			const userRole = req.user.role;
			if (!allowedRoles.includes(userRole)) {
				return res.status(403).json({ message: "Forbidden: insufficient role" });
			}

			return next();
		} catch (error) {
			console.error("Role middleware error:", error);
			return res.status(500).json({ message: "Server error" });
		}
	};
};

module.exports = permitRoles;

