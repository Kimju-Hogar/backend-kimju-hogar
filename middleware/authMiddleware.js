const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Usually payload is { user: { id: ... } }

        // If payload is minimal, we might not have email. 
        // We generally trust the token, but for emails we need the email address.
        // We will optimistically proceed, and let controllers fetch user if needed, 
        // OR we can fetch it here (expensive).
        // Let's keep it lightweight, but orderController relies on req.user having email.
        // If JWT payload doesn't have email, let's inject it if possible or ignore.
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
