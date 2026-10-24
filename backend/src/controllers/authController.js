const authService = require('../services/authService');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const result = await authService.verifyOtp(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const result = await authService.resendOtp(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully. Client token discarded.' },
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user_id: req.user.user_id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          department_id: req.user.department_id,
          department_name: req.user.department_name,
          created_at: req.user.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
