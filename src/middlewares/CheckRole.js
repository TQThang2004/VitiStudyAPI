export default function checkRoles(roles = []) {
  return (req, res, next) => {
    console.log("User role:", req.user?.role, roles);
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
    }
    next();
  };
}