import { Router } from "express";
import {
  addDiscussion,
  addDiscussionSchema,
  createLead,
  createLeadSchema,
  listLeads,
  updateLead,
  updateLeadSchema
} from "../controllers/leadController.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const leadRouter = Router();

leadRouter.get("/", asyncHandler(listLeads));
leadRouter.post("/", validate(createLeadSchema), asyncHandler(createLead));
leadRouter.patch("/:id", validate(updateLeadSchema), asyncHandler(updateLead));
leadRouter.post("/:id/discussions", validate(addDiscussionSchema), asyncHandler(addDiscussion));
