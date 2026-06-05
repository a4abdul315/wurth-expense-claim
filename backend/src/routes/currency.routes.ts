import { Router } from "express";
import { getRates, convert } from "../controllers/currency.controller";

const router = Router();

// Currency routes are public (no auth needed — rates are not sensitive)
router.get("/rates",   getRates); // GET  /api/currency/rates
router.post("/convert", convert); // POST /api/currency/convert

export default router;
