const complaintService = require('../services/complaintService');
const complaintRepository = require('../repositories/complaintRepository');
const feedbackRepository = require('../repositories/feedbackRepository');
const resolutionVerificationRepository = require('../repositories/resolutionVerificationRepository');
const path = require('path');
const config = require('../config/env');

function canViewComplaint(complaint, user) {
  return (
    user.role === 'ADMIN' ||
    (user.role === 'CITIZEN' && Number(complaint.user_id) === Number(user.user_id)) ||
    (user.role === 'OFFICER' && Number(complaint.officer_id) === Number(user.user_id))
  );
}

function hideUnapprovedResolution(complaint, user) {
  if (
    user.role !== 'CITIZEN' ||
    !['RESOLUTION_PENDING_REVIEW', 'RESOLUTION_REJECTED'].includes(complaint.status)
  ) {
    return complaint;
  }
  return {
    ...complaint,
    resolved_image: null,
    resolved_notes: null,
    resolved_by: null,
    resolved_by_name: null,
    resolved_at: null,
  };
}

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
        data: result.complaints.map((complaint) => hideUnapprovedResolution(complaint, req.user)),
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

      if (!canViewComplaint(complaint, req.user)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view this complaint.' },
        });
      }

      const attachments = await complaintRepository.getAttachments(complaintId);
      const feedback = await feedbackRepository.findByComplaintId(complaintId);
      const resolutionVerifications = await resolutionVerificationRepository.findByComplaintId(complaintId);
      const visibleComplaint = hideUnapprovedResolution(complaint, req.user);
      const visibleAttachments = req.user.role === 'CITIZEN'
        ? attachments.filter((attachment) => attachment.attachment_type === 'BEFORE')
        : attachments;

      res.status(200).json({
        success: true,
        data: {
          ...visibleComplaint,
          attachments: visibleAttachments,
          feedback_history: feedback,
          resolution_verifications: resolutionVerifications,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getEvidence(req, res, next) {
    try {
      if (!/^\d+$/.test(req.params.complaintId) || !['BEFORE', 'AFTER'].includes(req.params.type)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_EVIDENCE_REQUEST', message: 'A valid complaint ID and evidence type are required.' },
        });
      }

      const complaintId = Number.parseInt(req.params.complaintId, 10);
      const complaint = await complaintRepository.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          error: { code: 'COMPLAINT_NOT_FOUND', message: 'Complaint does not exist.' },
        });
      }

      if (!canViewComplaint(complaint, req.user)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view this evidence.' },
        });
      }

      if (
        req.user.role === 'CITIZEN' &&
        req.params.type === 'AFTER' &&
        ['RESOLUTION_PENDING_REVIEW', 'RESOLUTION_REJECTED'].includes(complaint.status)
      ) {
        return res.status(404).json({
          success: false,
          error: { code: 'EVIDENCE_NOT_FOUND', message: 'No administrator-approved resolution evidence is available.' },
        });
      }

      const evidencePath = req.params.type === 'BEFORE' ? complaint.image : complaint.resolved_image;
      if (!evidencePath) {
        return res.status(404).json({
          success: false,
          error: { code: 'EVIDENCE_NOT_FOUND', message: 'No evidence image is available.' },
        });
      }

      const filename = path.basename(evidencePath);
      if (!filename || filename === '.' || filename === path.sep) {
        return res.status(404).json({
          success: false,
          error: { code: 'EVIDENCE_NOT_FOUND', message: 'No evidence image is available.' },
        });
      }

      return res.sendFile(filename, {
        root: path.resolve(config.UPLOAD_DIR),
        dotfiles: 'deny',
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }, (error) => {
        if (error && !res.headersSent) next(error);
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

  async startWork(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const result = await complaintService.startWork(complaintId, req.user);
      res.status(200).json({ success: true, data: result });
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

  async reviewResolution(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { decision, rejection_reason } = req.body;
      const result = await complaintService.reviewResolution(complaintId, {
        decision,
        rejection_reason,
        actor: req.user,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async verifyResolution(req, res, next) {
    try {
      const complaintId = parseInt(req.params.complaintId, 10);
      const { decision, feedback_text } = req.body;
      const result = await complaintService.verifyResolution(complaintId, {
        decision,
        feedback_text,
        actor: req.user,
      });
      res.status(200).json({ success: true, data: result });
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

      if (!canViewComplaint(complaint, req.user)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to this complaint history.' },
        });
      }

      const fullHistory = await complaintRepository.getStatusHistory(complaintId);
      const history = req.user.role === 'CITIZEN'
        ? fullHistory.filter(
          (entry) => !['RESOLUTION_PENDING_REVIEW', 'RESOLUTION_REJECTED'].includes(entry.new_status)
        )
        : fullHistory;
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
