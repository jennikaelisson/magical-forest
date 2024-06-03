import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "./users.controller";

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/logout", logoutUser);

export default router;