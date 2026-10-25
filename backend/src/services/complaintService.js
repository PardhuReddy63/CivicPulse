const db = require('../config/db');
const complaintRepository = require('../repositories/complaintRepository');
const feedbackRepository = require('../repositories/feedbackRepository');
const auditRepository = require('../repositories/auditRepository');
const userRepository = require('../repositories/userRepository');
const workflowRules = require('./workflowRules');

class ComplaintService {
  async createComplaint({ title, description, category, sub_category, location, latitude, longitude, image_file, user }) {
    if (user.role !== 'CITIZEN') {
      const err = new Error('Only registered citizens can lodge complaints.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const imagePath = image_file ? `/uploads/${image_file.filename}` : null;

      const complaintId = await complaintRepository.create(
        {
          title,
          description,
          category,
          sub_category,
          location,
          latitude,
          longitude,
          image: imagePath,
          user_id: user.user_id,
        },
        conn
      );

      if (!complaintId) {
        const err = new Error('Could not create the grievance record. Please try again.');
        err.status = 500;
        err.code = 'COMPLAINT_ID_UNAVAILABLE';
        throw err;
      }

      if (image_file) {
        await complaintRepository.addAttachment(
          {
            complaint_id: complaintId,
            attachment_type: 'BEFORE',
            file_path: imagePath,
            mime_type: image_file.mimetype,
            uploaded_by: user.user_id,
          },
          conn
        );
      }

      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: user.user_id,
          old_status: null,
          new_status: 'PENDING',
          reason: 'Citizen lodged grievance',
        },
        conn
      );

      await auditRepository.log({
        actor_user_id: user.user_id,
        action: 'COMPLAINT_CREATED',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { category, location },
        client: conn,
      });

      return await complaintRepository.findById(complaintId);
    });
  }

  async assignComplaint(complaintId, { officer_id, priority, deadline, actor }) {
    if (actor.role !== 'ADMIN') {
      const err = new Error('Only administrators can assign complaints.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const complaint = await complaintRepository.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }
    workflowRules.assertAssignable(complaint.status);

    const officer = await userRepository.findById(officer_id);
    if (!officer || officer.role !== 'OFFICER' || !officer.active || !officer.verified) {
      const err = new Error('Selected officer is invalid, inactive, unverified, or not an officer.');
      err.status = 400;
      err.code = 'INVALID_OFFICER';
      throw err;
    }
    const department = await userRepository.findDepartmentByName(complaint.category);
    if (!department) {
      const err = new Error('No active department is configured for this grievance category.');
      err.status = 409;
      err.code = 'DEPARTMENT_NOT_CONFIGURED';
      throw err;
    }
    if (Number(officer.department_id) !== Number(department.department_id)) {
      const err = new Error('The selected officer does not belong to this grievance department.');
      err.status = 400;
      err.code = 'OFFICER_DEPARTMENT_MISMATCH';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const oldStatus = complaint.status;
      await complaintRepository.assignOfficer(
        complaintId,
        {
          officer_id,
          priority: priority || complaint.priority,
          deadline: deadline || complaint.deadline,
        },
        conn
      );

      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: actor.user_id,
          old_status: oldStatus,
          new_status: 'ASSIGNED',
          reason: `Assigned to ${officer.name}. Deadline: ${deadline || 'N/A'}, Priority: ${priority || complaint.priority}`,
        },
        conn
      );

      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: 'COMPLAINT_ASSIGNED',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { officer_id, officer_name: officer.name, priority, deadline },
        client: conn,
      });

      return await complaintRepository.findById(complaintId);
    });
  }

  async updatePriority(complaintId, priority, actor) {
    if (actor.role !== 'ADMIN') {
      const err = new Error('Only administrators can set overall priority.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const complaint = await complaintRepository.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }

    await complaintRepository.updatePriority(complaintId, priority);
    await auditRepository.log({
      actor_user_id: actor.user_id,
      action: 'PRIORITY_UPDATED',
      entity_type: 'COMPLAINT',
      entity_id: complaintId,
      details_json: { old_priority: complaint.priority, new_priority: priority },
    });

    return await complaintRepository.findById(complaintId);
  }

  async updateOfficerPriority(complaintId, officerPriority, actor) {
    const complaint = await complaintRepository.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }

    if (actor.role !== 'OFFICER' || complaint.officer_id !== actor.user_id) {
      const err = new Error('You can only update your own assigned complaint priority.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    await complaintRepository.updateOfficerPriority(complaintId, officerPriority);
    await auditRepository.log({
      actor_user_id: actor.user_id,
      action: 'OFFICER_PRIORITY_UPDATED',
      entity_type: 'COMPLAINT',
      entity_id: complaintId,
      details_json: { officer_priority: officerPriority },
    });

    return await complaintRepository.findById(complaintId);
  }

  async updateDeadline(complaintId, deadline, actor) {
    if (actor.role !== 'ADMIN') {
      const err = new Error('Only administrators can set or update deadlines.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const complaint = await complaintRepository.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }

    await complaintRepository.updateDeadline(complaintId, deadline);
    await auditRepository.log({
      actor_user_id: actor.user_id,
      action: 'DEADLINE_UPDATED',
      entity_type: 'COMPLAINT',
      entity_id: complaintId,
      details_json: { old_deadline: complaint.deadline, new_deadline: deadline },
    });

    return await complaintRepository.findById(complaintId);
  }

  async resolveComplaint(complaintId, { resolved_notes, after_file, actor }) {
    const complaint = await complaintRepository.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }

    // Role & assignment check: only assigned officer resolves
    if (actor.role !== 'OFFICER' || complaint.officer_id !== actor.user_id) {
      const err = new Error('Only the assigned officer can resolve this complaint.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    workflowRules.assertResolvable(complaint.status);

    return await db.withTransaction(async (conn) => {
      const afterImagePath = after_file ? `/uploads/${after_file.filename}` : null;

      await complaintRepository.markResolved(
        complaintId,
        {
          resolved_by: actor.user_id,
          resolved_notes,
          resolved_image: afterImagePath,
        },
        conn
      );

      if (after_file) {
        await complaintRepository.addAttachment(
          {
            complaint_id: complaintId,
            attachment_type: 'AFTER',
            file_path: afterImagePath,
            mime_type: after_file.mimetype,
            uploaded_by: actor.user_id,
          },
          conn
        );
      }

      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: actor.user_id,
          old_status: complaint.status,
          new_status: 'RESOLVED',
          reason: resolved_notes,
        },
        conn
      );

      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: 'COMPLAINT_RESOLVED',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { notes: resolved_notes, image: afterImagePath },
        client: conn,
      });

      return await complaintRepository.findById(complaintId);
    });
  }

  async submitFeedback(complaintId, { rating, feedback_text, actor }) {
    const complaint = await complaintRepository.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }

    // Citizen owner verification
    if (actor.role !== 'CITIZEN' || complaint.user_id !== actor.user_id) {
      const err = new Error('Only the citizen who lodged this complaint can submit feedback.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Must be in RESOLVED state
    if (complaint.status !== 'RESOLVED') {
      const err = new Error('Feedback can only be submitted for resolved complaints.');
      err.status = 400;
      err.code = 'COMPLAINT_NOT_RESOLVED';
      throw err;
    }

    const ratingNum = workflowRules.parseRating(rating);

    return await db.withTransaction(async (conn) => {
      // 1. Record feedback
      await feedbackRepository.create(
        {
          complaint_id: complaintId,
          citizen_id: actor.user_id,
          rating: ratingNum,
          feedback_text,
          resolution_cycle: complaint.resolution_cycle || 1,
        },
        conn
      );

      let reopened = false;

      // 2. Automated Reopening Policy: rating 1 or 2 reopens complaint to PENDING
      if (workflowRules.statusAfterFeedback(ratingNum) === 'PENDING') {
        reopened = true;
        await complaintRepository.reopenToPending(complaintId, conn);

        await complaintRepository.addStatusHistory(
          {
            complaint_id: complaintId,
            changed_by: actor.user_id,
            old_status: 'RESOLVED',
            new_status: 'PENDING',
            reason: `Automated reopening due to citizen rating ${ratingNum}/5: ${feedback_text || 'No comment provided'}`,
          },
          conn
        );

        await auditRepository.log({
          actor_user_id: actor.user_id,
          action: 'COMPLAINT_REOPENED_LOW_RATING',
          entity_type: 'COMPLAINT',
          entity_id: complaintId,
          details_json: { rating: ratingNum, cycle: complaint.resolution_cycle },
          client: conn,
        });
      } else {
        await auditRepository.log({
          actor_user_id: actor.user_id,
          action: 'COMPLAINT_FEEDBACK_SATISFIED',
          entity_type: 'COMPLAINT',
          entity_id: complaintId,
          details_json: { rating: ratingNum },
          client: conn,
        });
      }

      const updated = await complaintRepository.findById(complaintId);
      return {
        complaint: updated,
        reopened,
        message: reopened
          ? 'Feedback received. Due to low rating (1-2), the complaint has been automatically reopened to PENDING for admin review.'
          : 'Thank you for your feedback! The resolution has been accepted.',
      };
    });
  }
}

module.exports = new ComplaintService();
