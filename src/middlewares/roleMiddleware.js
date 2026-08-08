const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "يجب تسجيل الدخول أولًا.",
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];

    const hasAllowedRole = userRoles.some((role) =>
      allowedRoles.includes(role),
    );

    if (!hasAllowedRole) {
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
