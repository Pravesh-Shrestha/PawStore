import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Contact from "../models/contactModel";
import { writeLog, logLevels } from "../utils/activityLogger";

const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// @desc    Create a new contact message
// @route   POST /api/contact
// @access  Public
const createContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  const contact = new Contact({
    name,
    email,
    subject,
    message,
  });

  const createdContact = await contact.save();

  writeLog(logLevels.INFO, "CONTACT_MESSAGE_SENT", "anonymous", {
    contactId: (createdContact._id as any).toString(),
    name,
    email,
    subject,
  }, req);

  res.status(201).json({
    message: "Your message has been sent successfully. We'll get back to you soon!",
    contact: createdContact,
  });
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
const getContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({}).sort({ createdAt: -1 });
  res.json(contacts);
});

// @desc    Get a contact message by ID
// @route   GET /api/contact/:id
// @access  Private/Admin
const getContactById = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (contact) {
    res.json(contact);
  } else {
    res.status(404);
    throw new Error("Contact message not found");
  }
});

// @desc    Update contact status
// @route   PUT /api/contact/:id
// @access  Private/Admin
const updateContactStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (contact) {
    const oldStatus = contact.status;
    contact.status = status || contact.status;

    const updatedContact = await contact.save();

    writeLog(logLevels.INFO, "CONTACT_STATUS_UPDATED", getUserId(req.user), {
      contactId: req.params.id,
      oldStatus,
      newStatus: updatedContact.status,
    }, req);

    res.json(updatedContact);
  } else {
    writeLog(logLevels.WARN, "CONTACT_UPDATE_NOT_FOUND", getUserId(req.user), {
      contactId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Contact message not found");
  }
});

// @desc    Delete a contact message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (contact) {
    await Contact.deleteOne({ _id: contact._id });

    writeLog(logLevels.SECURITY, "CONTACT_DELETED", getUserId(req.user), {
      contactId: req.params.id,
      contactEmail: contact.email,
      subject: contact.subject,
    }, req);

    res.json({ message: "Contact message removed" });
  } else {
    writeLog(logLevels.WARN, "CONTACT_DELETE_NOT_FOUND", getUserId(req.user), {
      contactId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Contact message not found");
  }
});

export {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};
