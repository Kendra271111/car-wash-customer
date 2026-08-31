import type { Request, Response, NextFunction } from "express";
import prisma from "../libs/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const pfp = req.file ? (req.file as Express.Multer.File).filename : null;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password as string, salt);

    const newUser = await prisma.user.create({
      data: {
        name: name as string,
        email: email as string,
        password: hashedPassword,
        pfp,
      },
    });

    return res.status(201).json({
      message: "Registration Completed",
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        pfp: newUser.pfp,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email as string },
    });
    const isMatch = user
      ? await bcrypt.compare(password as string, user.password)
      : false;

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Wrong username or email" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Customer

export const customerRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existing = await prisma.customers.findUnique({
      where: { email: email as string },
    });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const pfp = req.file ? (req.file as Express.Multer.File).filename : null;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password as string, salt);

    const phoneValue =
      phone !== undefined && phone !== null && phone !== ""
        ? Number(phone)
        : null;

    if (phoneValue !== null && Number.isNaN(phoneValue)) {
      return res.status(400).json({ message: "Phone must be a valid number" });
    }

    const newCustomer = await prisma.customers.create({
      data: {
        name: name as string,
        email: email as string,
        password: hashedPassword,
        phone: phoneValue as number, // required in schema — see note below
        pfp,
        role: "USER",
      },
    });

    return res.status(201).json({
      message: "Customer registration completed",
      data: {
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        pfp: newCustomer.pfp,
        role: newCustomer.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const customerLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const customer = await prisma.customers.findUnique({
      where: { email: String(email) },
    });

    if (!customer?.password) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    const isMatch = await bcrypt.compare(String(password), customer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set");
    }

    const token = jwt.sign(
      {
        id: customer.id,
        email: customer.email,
        role: customer.role ?? "USER",
        type: "customer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role ?? "USER",
        pfp: customer.pfp,
        type: "customer",
      },
    });
  } catch (error) {
    next(error);
  }
};

