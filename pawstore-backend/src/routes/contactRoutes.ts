import express from 'express';
const router = express.Router();


import { createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
 } from "../controllers/contactController";
import { protect, admin  } from "../middleware/authMiddleware";

router.route("/").post(createContact).get(protect, admin, getContacts);
router
  .route("/:id")
  .get(protect, admin, getContactById)
  .put(protect, admin, updateContactStatus)
  .delete(protect, admin, deleteContact);

export default router;



