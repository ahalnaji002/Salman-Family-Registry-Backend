const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authenticate = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "يجب تسجيل الدخول للوصول إلى هذا المسار.",
      });
    }

    const token = authorizationHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "رمز المصادقة غير موجود.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db("users")
      .where({ id: decoded.userId })
      .select("id", "full_name", "national_id", "phone", "is_active")
      .first();

    if (!user) {
      return res.status(401).json({
        message: "المستخدم المرتبط بالرمز غير موجود.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: "هذا الحساب غير فعال.",
      });
    }

    req.user = {
      id: user.id,
      full_name: user.full_name,
      national_id: user.national_id,
      phone: user.phone,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "انتهت صلاحية جلسة تسجيل الدخول.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "رمز المصادقة غير صالح.",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء التحقق من تسجيل الدخول.",
    });
  }
};

module.exports = {
  authenticate,
};
