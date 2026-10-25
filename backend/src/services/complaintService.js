const db = require('../config/db');
const complaintRepository = require('../repositories/complaintRepository');
const feedbackRepository = require('../repositories/feedbackRepository');
const resolutionVerificationRepository = require('../repositories/resolutionVerificationRepository');
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

      const department = await userRepository.findDepartmentByName(category, conn);
      const officerId = department
        ? await complaintRepository.findLeastLoadedOfficerId(department.department_id, conn)
        : null;
      const status = officerId ? 'ASSIGNED' : 'PENDING';

      if (officerId) {
        await complaintRepository.assignOfficer(
          complaintId,
          { officer_id: officerId },
          conn
        );
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
          new_status: status,
          reason: officerId
            ? `Citizen lodged grievance and it was automatically assigned to officer #${officerId}.`
            : 'Citizen lodged grievance. Pending assignment because no eligible active, verified officer is available for this department.',
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

      if (officerId) {
        await auditRepository.log({
          actor_user_id: null,
          action: 'COMPLAINT_AUTO_ASSIGNED',
          entity_type: 'COMPLAINT',
          entity_id: complaintId,
          details_json: {
            officer_id: officerId,
            department_id: department.department_id,
            assignment_strategy: 'least_active_workload_then_lowest_user_id',
          },
          client: conn,
        });
      } else {
        await auditRepository.log({
          actor_user_id: null,
          action: 'COMPLAINT_ASSIGNMENT_UNAVAILABLE',
          entity_type: 'COMPLAINT',
          entity_id: complaintId,
          details_json: {
            category,
            department_configured: Boolean(department),
            message: 'The grievance remains pending until an eligible officer is available and an administrator assigns it.',
          },
          client: conn,
        });
      }

      return await complaintRepository.findById(complaintId, conn);
    });
  }

  async recoverPendingAssignments(limit = 100) {
    return db.withTransaction(async (conn) => {
      const pending = await complaintRepository.findPendingUnassigned(
        conn,
        limit
      );

      const results = [];

      for (const grievance of pending) {
        const department = await userRepository.findDepartmentByName(
          grievance.category,
          conn
        );

        if (!department) {
          continue;
        }

        const officerId =
          await complaintRepository.findLeastLoadedOfficerId(
            department.department_id,
            conn
          );

        if (!officerId) {
          continue;
        }

        const assignmentResult = await complaintRepository.assignOfficer(
          grievance.complaint_id,
          { officer_id: officerId },
          conn
        );

        if (assignmentResult.affectedRows !== 1) {
          continue;
        }

        await complaintRepository.addStatusHistory(
          {
            complaint_id: grievance.complaint_id,
            changed_by: null,
            old_status: 'PENDING',
            new_status: 'ASSIGNED',
            reason: `Automatically assigned to eligible officer #${officerId} during pending-grievance recovery.`,
          },
          conn
        );

        await auditRepository.log({
          actor_user_id: null,
          action: 'COMPLAINT_AUTO_ASSIGNED',
          entity_type: 'COMPLAINT',
          entity_id: grievance.complaint_id,
          details_json: {
            officer_id: officerId,
            department_id: department.department_id,
            assignment_strategy: 'least_active_workload_then_lowest_user_id',
            trigger: 'pending_assignment_recovery',
          },
          client: conn,
        });

        results.push({
          complaint_id: grievance.complaint_id,
          officer_id: officerId,
        });
      }

      return {
        processed: pending.length,
        assigned: results.length,
        assignments: results,
      };
    });
  }

  async assignComplaint(complaintId, { officer_id, priority, deadline, actor }) {
    if (actor.role !== 'ADMIN') {
      const err = new Error('Only administrators can assign complaints.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const initialComplaint = await complaintRepository.findById(complaintId);
    if (!initialComplaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'COMPLAINT_NOT_FOUND';
      throw err;
    }
    workflowRules.assertAssignable(initialComplaint.status);

    const officer = await userRepository.findById(officer_id);
    if (!officer || officer.role !== 'OFFICER' || !officer.active || !officer.verified) {
      const err = new Error('Selected officer is invalid, inactive, unverified, or not an officer.');
      err.status = 400;
      err.code = 'INVALID_OFFICER';
      throw err;
    }
    const initialDepartment = await userRepository.findDepartmentByName(initialComplaint.category);
    if (!initialDepartment) {
      const err = new Error('No active department is configured for this grievance category.');
      err.status = 409;
      err.code = 'DEPARTMENT_NOT_CONFIGURED';
      throw err;
    }
    if (Number(officer.department_id) !== Number(initialDepartment.department_id)) {
      const err = new Error('The selected officer does not belong to this grievance department.');
      err.status = 400;
      err.code = 'OFFICER_DEPARTMENT_MISMATCH';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const complaint = await complaintRepository.findById(complaintId, conn, { forUpdate: true });
      if (!complaint) {
        const err = new Error('Complaint not found.');
        err.status = 404;
        err.code = 'COMPLAINT_NOT_FOUND';
        throw err;
      }
      workflowRules.assertAssignable(complaint.status);
      const lockedOfficer = await userRepository.findById(officer_id, conn, { forUpdate: true });
      if (
        !lockedOfficer ||
        lockedOfficer.role !== 'OFFICER' ||
        !lockedOfficer.active ||
        !lockedOfficer.verified
      ) {
        const err = new Error('Selected officer is invalid, inactive, unverified, or not an officer.');
        err.status = 400;
        err.code = 'INVALID_OFFICER';
        throw err;
      }
      const department = await userRepository.findDepartmentByName(complaint.category, conn);
      if (!department) {
        const err = new Error('No active department is configured for this grievance category.');
        err.status = 409;
        err.code = 'DEPARTMENT_NOT_CONFIGURED';
        throw err;
      }
      if (Number(lockedOfficer.department_id) !== Number(department.department_id)) {
        const err = new Error('The selected officer does not belong to this grievance department.');
        err.status = 400;
        err.code = 'OFFICER_DEPARTMENT_MISMATCH';
        throw err;
      }
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
          reason: `Assigned to ${lockedOfficer.name}. Deadline: ${deadline || 'N/A'}, Priority: ${priority || complaint.priority}`,
        },
        conn
      );

      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: 'COMPLAINT_ASSIGNED',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { officer_id, officer_name: lockedOfficer.name, priority, deadline },
        client: conn,
      });
      return await complaintRepository.findById(complaintId, conn);
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

    if (actor.role !== 'OFFICER' || Number(complaint.officer_id) !== Number(actor.user_id)) {
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

  async startWork(complaintId, actor) {
    if (actor.role !== 'OFFICER') {
      const err = new Error('Only an officer can start work on a grievance.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const complaint = await complaintRepository.findById(
        complaintId,
        conn,
        { forUpdate: true }
      );
      if (!complaint) {
        const err = new Error('Complaint not found.');
        err.status = 404;
        err.code = 'COMPLAINT_NOT_FOUND';
        throw err;
      }
      if (Number(complaint.officer_id) !== Number(actor.user_id)) {
        const err = new Error('Only the assigned officer can start work on this grievance.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      workflowRules.assertStartable(complaint.status);

      await complaintRepository.setStatus(complaintId, 'IN_PROGRESS', conn);
      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: actor.user_id,
          old_status: complaint.status,
          new_status: 'IN_PROGRESS',
          reason: complaint.status === 'RESOLUTION_REJECTED'
            ? 'Assigned officer started the requested resolution revisions.'
            : 'Assigned officer started investigating the grievance.',
        },
        conn
      );
      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: 'COMPLAINT_WORK_STARTED',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { previous_status: complaint.status },
        client: conn,
      });
      return await complaintRepository.findById(complaintId, conn);
    });
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
    if (!after_file) {
      const err = new Error('A supported after-resolution photo is required for admin review.');
      err.status = 400;
      err.code = 'RESOLUTION_PHOTO_REQUIRED';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const complaint = await complaintRepository.findById(complaintId, conn, { forUpdate: true });
      if (!complaint) {
        const err = new Error('Complaint not found.');
        err.status = 404;
        err.code = 'COMPLAINT_NOT_FOUND';
        throw err;
      }

      if (actor.role !== 'OFFICER' || Number(complaint.officer_id) !== Number(actor.user_id)) {
        const err = new Error('Only the assigned officer can submit resolution evidence.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }

      workflowRules.assertResolvable(complaint.status);
      const afterImagePath = `/uploads/${after_file.filename}`;
      await complaintRepository.submitResolution(
        complaintId,
        {
          resolved_by: actor.user_id,
          resolved_notes,
          resolved_image: afterImagePath,
        },
        conn
      );
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
      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: actor.user_id,
          old_status: complaint.status,
          new_status: 'RESOLUTION_PENDING_REVIEW',
          reason: resolved_notes,
        },
        conn
      );
      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: 'RESOLUTION_SUBMITTED_FOR_REVIEW',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { notes: resolved_notes, image: afterImagePath },
        client: conn,
      });
      return await complaintRepository.findById(complaintId, conn);
    });
  }

  async reviewResolution(complaintId, { decision, rejection_reason, actor }) {
    if (actor.role !== 'ADMIN') {
      const err = new Error('Only administrators can review resolution evidence.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      const err = new Error('Resolution review decision must be APPROVE or REJECT.');
      err.status = 400;
      err.code = 'INVALID_REVIEW_DECISION';
      throw err;
    }
    if (decision === 'REJECT' && !String(rejection_reason || '').trim()) {
      const err = new Error('A reason is required when rejecting resolution evidence.');
      err.status = 400;
      err.code = 'REJECTION_REASON_REQUIRED';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const complaint = await complaintRepository.findById(complaintId, conn, { forUpdate: true });
      if (!complaint) {
        const err = new Error('Complaint not found.');
        err.status = 404;
        err.code = 'COMPLAINT_NOT_FOUND';
        throw err;
      }
      if (Number(complaint.resolved_by) === Number(actor.user_id)) {
        const err = new Error('The officer who submitted this evidence cannot review their own resolution.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (complaint.status !== 'RESOLUTION_PENDING_REVIEW') {
        const err = new Error('Only resolution evidence awaiting review can be approved or rejected.');
        err.status = 409;
        err.code = 'INVALID_STATUS_TRANSITION';
        throw err;
      }

      const nextStatus = decision === 'APPROVE' ? 'AWAITING_CITIZEN' : 'RESOLUTION_REJECTED';
      const reason = decision === 'APPROVE'
        ? 'Administrator approved resolution evidence; awaiting citizen verification.'
        : String(rejection_reason).trim();
      await complaintRepository.setStatus(complaintId, nextStatus, conn);
      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: actor.user_id,
          old_status: complaint.status,
          new_status: nextStatus,
          reason,
        },
        conn
      );
      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: decision === 'APPROVE' ? 'RESOLUTION_APPROVED' : 'RESOLUTION_REJECTED',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { decision, rejection_reason: decision === 'REJECT' ? reason : null },
        client: conn,
      });
      return await complaintRepository.findById(complaintId, conn);
    });
  }

  async verifyResolution(complaintId, { decision, feedback_text, actor }) {
    if (actor.role !== 'CITIZEN') {
      const err = new Error('Only the citizen who submitted the grievance can verify its resolution.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (!['RESOLVED', 'NOT_RESOLVED'].includes(decision)) {
      const err = new Error('Resolution verification must be RESOLVED or NOT_RESOLVED.');
      err.status = 400;
      err.code = 'INVALID_VERIFICATION_DECISION';
      throw err;
    }

    return await db.withTransaction(async (conn) => {
      const complaint = await complaintRepository.findById(complaintId, conn, { forUpdate: true });
      if (!complaint) {
        const err = new Error('Complaint not found.');
        err.status = 404;
        err.code = 'COMPLAINT_NOT_FOUND';
        throw err;
      }
      if (Number(complaint.user_id) !== Number(actor.user_id)) {
        const err = new Error('Only the citizen who lodged this grievance can verify it.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (complaint.status !== 'AWAITING_CITIZEN') {
        const err = new Error('Only administrator-approved resolution evidence can be verified.');
        err.status = 409;
        err.code = 'INVALID_STATUS_TRANSITION';
        throw err;
      }
      const cycle = Number(complaint.resolution_cycle) || 1;
      if (await resolutionVerificationRepository.hasVerificationForCycle(complaintId, cycle, conn)) {
        const err = new Error('A verification response has already been recorded for this resolution cycle.');
        err.status = 409;
        err.code = 'DUPLICATE_VERIFICATION';
        throw err;
      }

      const resolved = decision === 'RESOLVED';
      await resolutionVerificationRepository.create(
        {
          complaint_id: complaintId,
          resolution_cycle: cycle,
          citizen_id: actor.user_id,
          decision,
          feedback_text: String(feedback_text || '').trim(),
        },
        conn
      );
      await complaintRepository.verifyResolution(complaintId, resolved, conn);
      const nextStatus = resolved ? 'RESOLVED' : 'ASSIGNED';
      const reason = resolved
        ? 'Citizen confirmed that the grievance is resolved.'
        : `Citizen reported that the grievance is not resolved: ${String(feedback_text || '').trim() || 'No additional details provided.'}`;
      await complaintRepository.addStatusHistory(
        {
          complaint_id: complaintId,
          changed_by: actor.user_id,
          old_status: complaint.status,
          new_status: nextStatus,
          reason,
        },
        conn
      );
      await auditRepository.log({
        actor_user_id: actor.user_id,
        action: resolved ? 'CITIZEN_CONFIRMED_RESOLUTION' : 'CITIZEN_REJECTED_RESOLUTION',
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
        details_json: { decision, resolution_cycle: cycle, feedback_text: feedback_text || null },
        client: conn,
      });
      return {
        complaint: await complaintRepository.findById(complaintId, conn),
        decision,
      };
    });
  }

  async submitFeedback(complaintId, { rating, feedback_text, actor }) {
    const ratingNum = workflowRules.parseRating(rating);

    return await db.withTransaction(async (conn) => {
      const complaint = await complaintRepository.findById(complaintId, conn, { forUpdate: true });
      if (!complaint) {
        const err = new Error('Complaint not found.');
        err.status = 404;
        err.code = 'COMPLAINT_NOT_FOUND';
        throw err;
      }
      if (actor.role !== 'CITIZEN' || Number(complaint.user_id) !== Number(actor.user_id)) {
        const err = new Error('Only the citizen who lodged this complaint can submit feedback.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (complaint.status !== 'RESOLVED') {
        const err = new Error('Feedback can only be submitted for resolved complaints.');
        err.status = 400;
        err.code = 'COMPLAINT_NOT_RESOLVED';
        throw err;
      }
      const cycle = Number(complaint.resolution_cycle) || 1;
      if (await feedbackRepository.hasFeedbackForCycle(complaintId, cycle, conn)) {
        const err = new Error('Feedback has already been recorded for this resolution cycle.');
        err.status = 409;
        err.code = 'DUPLICATE_VERIFICATION';
        throw err;
      }

      // 1. Record feedback
      await feedbackRepository.create(
        {
          complaint_id: complaintId,
          citizen_id: actor.user_id,
          rating: ratingNum,
          feedback_text,
          resolution_cycle: cycle,
        },
        conn
      );

      let reopened = false;

      // 2. Ratings of 1 or 2 return the grievance to its assigned officer.
      if (workflowRules.statusAfterFeedback(ratingNum) === 'ASSIGNED') {
        reopened = true;
        await complaintRepository.reopenToAssigned(complaintId, conn);

        await complaintRepository.addStatusHistory(
          {
            complaint_id: complaintId,
            changed_by: actor.user_id,
            old_status: 'RESOLVED',
            new_status: 'ASSIGNED',
            reason: `Returned to the assigned officer due to citizen rating ${ratingNum}/5: ${feedback_text || 'No comment provided'}`,
          },
          conn
        );

        await auditRepository.log({
          actor_user_id: actor.user_id,
          action: 'COMPLAINT_REOPENED_LOW_RATING',
          entity_type: 'COMPLAINT',
          entity_id: complaintId,
          details_json: { rating: ratingNum, cycle },
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

      const updated = await complaintRepository.findById(complaintId, conn);
      return {
        complaint: updated,
        reopened,
        message: reopened
          ? 'Feedback received. The grievance has been reopened for its assigned officer.'
          : 'Thank you for your feedback! The resolution has been accepted.',
      };
    });
  }
}

module.exports = new ComplaintService();
