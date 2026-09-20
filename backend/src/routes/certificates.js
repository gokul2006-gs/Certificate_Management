import { Router } from "express";
import { asyncHandler } from "../utils/http.js";
import { requireAdmin, requireAnyUser } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { revokeSchema } from "../validators/schemas.js";
import * as certificates from "../controllers/certificateController.js";

export const certificateRouter = Router();

certificateRouter.get("/", requireAdmin, asyncHandler(certificates.listCertificates));
certificateRouter.post("/upload", requireAdmin, upload.single("certificate_file"), asyncHandler(certificates.uploadCertificate));
certificateRouter.post(
  "/bulk-upload",
  requireAdmin,
  upload.fields([
    { name: "certificate_files", maxCount: 40 },
    { name: "zip_file", maxCount: 1 },
  ]),
  asyncHandler(certificates.bulkUploadCertificates)
);
certificateRouter.post(
  "/generation-jobs",
  requireAdmin,
  upload.single("template_file"),
  asyncHandler(certificates.createGenerationJob)
);
certificateRouter.get("/generation-jobs/:jobId", requireAdmin, asyncHandler(certificates.pollGenerationJob));
certificateRouter.post("/generation-jobs/:jobId/cancel", requireAdmin, asyncHandler(certificates.cancelGenerationJob));
certificateRouter.get("/verify/:studentId", asyncHandler(certificates.verifyCertificate));
certificateRouter.get("/view/:studentId", requireAnyUser, asyncHandler(certificates.viewCertificate));
certificateRouter.get("/download/:studentId", asyncHandler(certificates.downloadCertificate));
certificateRouter.get("/download-all", requireAdmin, asyncHandler(certificates.downloadAllCertificates));
certificateRouter.get("/views/:studentId", requireAdmin, asyncHandler(certificates.certificateViews));
certificateRouter.post("/:id/revoke", requireAdmin, validate(revokeSchema), asyncHandler(certificates.revokeCertificate));
