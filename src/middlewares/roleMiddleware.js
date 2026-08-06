const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "يجب تسجيل الدخول أولًا.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "ليس لديك صلاحية للوصول إلى هذا المسار.",
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
