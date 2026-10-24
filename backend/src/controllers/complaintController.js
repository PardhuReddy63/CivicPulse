const complaintService = require('../services/complaintService');
const complaintRepository = require('../repositories/complaintRepository');
const feedbackRepository = require('../repositories/feedbackRepository');

class ComplaintController {
  async createComplaint(req, res, next) {
    try {
      const data = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        sub_category: req.body.sub_category,
        location: req.body.location,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
        image_file: req.file || null,
        user: req.user,
      };

      const result = await complaintService.createComplaint(data);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listComplaints(req, res, next) {
    try {
      const { page, limit, status, priority, category, search } = req.query;
      const result = await complaintRepository.listAll({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        status,
        priority,
        category,
        search,
      });

      res.status(200).json({
        success: true,
        data: result.complaints,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async listMyComplaints(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await complaintRepository.listByCitizen(req.user.user_id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        status,
      });

      res.status(200).json({
        success: true,
        data: result.complaints,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async listAssignedComplaints(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await complaintRepository.listByOfficer(req.user.user_id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        status,
      });

      res.status(200).json({
        success: true,
        data: result.complaints,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getComplaintById(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const complaint = await complaintRepository.findById(complaintId);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          error: { code: 'COMPLAINT_NOT_FOUND', message: 'Complaint does not exist.' },
        });
      }

      // Authorization guard: Admin can view all; citizen can view their own; officer can view assigned
      const isOwner = req.user.role === 'CITIZEN' && complaint.user_id === req.user.user_id;
      const isOfficer = req.user.role === 'OFFICER' && complaint.officer_id === req.user.user_id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwner && !isOfficer && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view this complaint.' },
        });
      }

      const attachments = await complaintRepository.getAttachments(complaintId);
      const feedback = await feedbackRepository.findByComplaintId(complaintId);

      res.status(200).json({
        success: true,
        data: {
          ...complaint,
          attachments,
          feedback_history: feedback,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async assignComplaint(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { officer_id, priority, deadline } = req.body;
      const result = await complaintService.assignComplaint(complaintId, {
        officer_id: parseInt(officer_id, 10),
        priority,
        deadline,
        actor: req.user,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async setPriority(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { priority } = req.body;
      const result = await complaintService.updatePriority(complaintId, priority, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async setOfficerPriority(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { officer_priority } = req.body;
      const result = await complaintService.updateOfficerPriority(complaintId, officer_priority, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async setDeadline(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { deadline } = req.body;
      const result = await complaintService.updateDeadline(complaintId, deadline, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async resolveComplaint(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { resolved_notes } = req.body;
      const result = await complaintService.resolveComplaint(complaintId, {
        resolved_notes,
        after_file: req.file || null,
        actor: req.user,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listResolvedComplaints(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await complaintRepository.listAll({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        status: 'RESOLVED',
      });

      res.status(200).json({
        success: true,
        data: result.complaints,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async submitFeedback(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { rating, feedback_text } = req.body;
      const result = await complaintService.submitFeedback(complaintId, {
        rating,
        feedback_text,
        actor: req.user,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getComplaintHistory(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const complaint = await complaintRepository.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          error: { code: 'COMPLAINT_NOT_FOUND', message: 'Complaint does not exist.' },
        });
      }

      // Check view permission
      const isOwner = req.user.role === 'CITIZEN' && complaint.user_id === req.user.user_id;
      const isOfficer = req.user.role === 'OFFICER' && complaint.officer_id === req.user.user_id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwner && !isOfficer && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to this complaint history.' },
        });
      }

      const history = await complaintRepository.getStatusHistory(complaintId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ComplaintController();
